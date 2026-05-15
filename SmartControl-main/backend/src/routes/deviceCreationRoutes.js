const shouldRetryWithoutNewColumns = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return message.includes('column') || message.includes('schema') || message.includes('cache');
};

const sanitizeText = (value = '', maxLength = 160) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength);

const normalizeTopicPart = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildProvisioningConfig = ({ env, userId, deviceId, projectName, token }) => {
  const topicRoot = `smartcontrol/${normalizeTopicPart(userId)}/${normalizeTopicPart(projectName || 'default')}/${normalizeTopicPart(deviceId)}`;

  return {
    protocol: 'smartcontrol.mqtt.v1',
    broker_url: env.MQTT_DEVICE_URL || env.MQTT_URL || null,
    username: env.MQTT_DEVICE_USERNAME || env.MQTT_USERNAME || null,
    topic_root: topicRoot,
    topics: {
      command: `${topicRoot}/cmd`,
      status: `${topicRoot}/status`,
      telemetry: `${topicRoot}/telemetry`,
      config: `${topicRoot}/config`,
      heartbeat: `${topicRoot}/heartbeat`,
      ack: `${topicRoot}/ack`,
      availability: `${topicRoot}/availability`,
    },
    device_token: token,
    heartbeat_interval_ms: Number(env.DEVICE_HEARTBEAT_INTERVAL_MS) || 30000,
  };
};

const buildFallbackDevicePayload = (payload) => ({
  user_id: payload.user_id,
  name: payload.name,
  type: payload.type || 'relay',
  status: Boolean(payload.status),
  device_id: payload.device_id || null,
  mac_address: payload.mac_address || null,
  mqtt_topic: payload.mqtt_topic || null,
  device_token: payload.device_token || null,
});

export const registerDeviceCreationRoutes = (app, {
  supabase,
  stripe,
  env = process.env,
  getRequestUser,
  assertCanCreateDevice,
  logEvent,
}) => {
  app.post('/api/devices', async (req, res) => {
    const requestUser = await getRequestUser(req);

    if (!requestUser) {
      return res.status(401).json({ error: 'Autenticacao obrigatoria para cadastrar dispositivos.' });
    }

    const body = req.body || {};
    const safeName = sanitizeText(body.name, 80);
    if (!safeName) {
      return res.status(400).json({ error: 'Nome do dispositivo e obrigatorio.' });
    }

    if (body.user_id && body.user_id !== requestUser.id) {
      return res.status(403).json({ error: 'Nao e permitido cadastrar dispositivo para outro usuario.' });
    }

    try {
      const billing = await assertCanCreateDevice({
        supabase,
        stripe,
        env,
        userId: requestUser.id,
      });

      const provisionedDeviceId = sanitizeText(body.device_id || body.deviceId || '', 100) || `sc-${randomUUID()}`;
      const provisionedToken = sanitizeText(body.device_token || body.deviceToken || '', 160) || randomUUID();
      const provisioning = buildProvisioningConfig({
        env,
        userId: requestUser.id,
        deviceId: provisionedDeviceId,
        projectName: body.project_name || body.projectName || '',
        token: provisionedToken,
      });

      const payload = {
        ...body,
        user_id: requestUser.id,
        name: safeName,
        type: sanitizeText(body.type || 'relay', 40) || 'relay',
        project_name: sanitizeText(body.project_name || body.projectName || '', 100) || null,
        project_type: sanitizeText(body.project_type || body.projectType || '', 60) || null,
        device_model: sanitizeText(body.device_model || body.deviceModel || '', 80) || null,
        protocol: sanitizeText(body.protocol || 'mqtt', 40) || 'mqtt',
        device_id: provisionedDeviceId,
        mac_address: sanitizeText(body.mac_address || body.macAddress || '', 60) || null,
        firmware_version: sanitizeText(body.firmware_version || body.firmwareVersion || '', 60) || null,
        hardware_version: sanitizeText(body.hardware_version || body.hardwareVersion || '', 80) || null,
        mqtt_broker: sanitizeText(body.mqtt_broker || body.mqttBroker || '', 160) || provisioning.broker_url,
        mqtt_topic: sanitizeText(body.mqtt_topic || body.mqttTopic || '', 180) || provisioning.topic_root,
        device_token: provisionedToken,
        local_ip: sanitizeText(body.local_ip || body.localIp || '', 80) || null,
        mdns_hostname: sanitizeText(body.mdns_hostname || body.mdnsHostname || '', 120) || null,
        connection_status: sanitizeText(body.connection_status || 'offline', 40) || 'offline',
        pairing_status: sanitizeText(body.pairing_status || 'provisioned', 40) || 'provisioned',
        module_type: sanitizeText(body.module_type || body.moduleType || 'generic_iot', 80) || 'generic_iot',
        capabilities: body.capabilities || {},
        configuration: {
          ...(body.configuration || {}),
          provisioning,
          integration_model: {
            device: true,
            entities: [],
            capabilities: body.capabilities || {},
            integrations: ['mqtt_discovery', 'rest', 'webhook', 'home_assistant', 'esphome', 'tuya', 'alexa', 'onvif', 'rtsp'],
          },
        },
        last_state: body.last_state || {},
        telemetry: body.telemetry || {},
      };

      let { data, error } = await supabase
        .from('devices')
        .insert(payload)
        .select()
        .single();

      if (error && shouldRetryWithoutNewColumns(error)) {
        const fallback = await supabase
          .from('devices')
          .insert(buildFallbackDevicePayload(payload))
          .select()
          .single();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      await logEvent?.({
        deviceId: data.id,
        userId: requestUser.id,
        type: 'device_created',
        payload: {
          source: 'api',
          plan_key: billing.current_plan?.key,
          devices_used: billing.limits.devices_used + 1,
          device_limit: billing.limits.device_limit,
        },
      });

      return res.status(201).json({
        device: data,
        billing: {
          ...billing,
          limits: {
            ...billing.limits,
            devices_used: billing.limits.devices_used + 1,
            devices_remaining: Math.max(billing.limits.devices_remaining - 1, 0),
            can_add_device: billing.limits.devices_used + 1 < billing.limits.device_limit,
          },
        },
      });
    } catch (error) {
      return res.status(error.statusCode || 400).json({
        error: error.message || 'Nao foi possivel cadastrar o dispositivo.',
        code: error.code || 'device_create_failed',
        billing: error.billing || null,
      });
    }
  });
};
import { randomUUID } from 'node:crypto';
