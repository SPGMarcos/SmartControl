import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mqtt from 'mqtt';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MQTT_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_CLIENT_ID,
  MQTT_STATUS_TOPICS,
  MQTT_REJECT_UNAUTHORIZED = 'true',
  MQTT_REQUIRE_DEVICE_TOKEN = 'false',
  CORS_ORIGIN,
  REQUIRE_AUTH = 'false',
  PORT = 4000,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios no backend.');
}

if (!MQTT_URL) {
  throw new Error('MQTT_URL e obrigatorio no backend.');
}

const requireAuth = REQUIRE_AUTH === 'true';
const requireDeviceToken = MQTT_REQUIRE_DEVICE_TOKEN === 'true';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
  global: {
    headers: {
      'x-client-info': 'smartcontrol-backend',
    },
  },
});

const normalizeTopicPart = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeTopicRoot = (topic = '') =>
  topic
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(cmd|status|telemetry|config|heartbeat|ack|availability)$/i, '');

const buildMqttTopics = (device = {}) => {
  const customRoot = device.mqtt_topic || device.topic;
  const root = customRoot
    ? normalizeTopicRoot(customRoot)
    : `smartcontrol/${normalizeTopicPart(device.user_id || 'cliente')}/${normalizeTopicPart(device.project_name || 'default')}/${normalizeTopicPart(device.device_id || device.id || 'device')}`;

  return {
    root,
    command: `${root}/cmd`,
    status: `${root}/status`,
    telemetry: `${root}/telemetry`,
    config: `${root}/config`,
    heartbeat: `${root}/heartbeat`,
    ack: `${root}/ack`,
    availability: `${root}/availability`,
  };
};

const isSmartControlTopicRoot = (topicRoot = '') => {
  const normalized = normalizeTopicRoot(topicRoot);
  return /^smartcontrol\/[^/]+\/[^/]+\/[^/]+$/.test(normalized) ? normalized : '';
};

const defaultStatusTopics = [
  'smartcontrol/+/+/+/status',
  'smartcontrol/+/+/+/telemetry',
  'smartcontrol/+/+/+/heartbeat',
  'smartcontrol/+/+/+/ack',
  'smartcontrol/+/+/+/availability',
  'smartcontrol/+/+/+/config',
  'smartcontrol/pairing/+/announce',
];

const statusTopics = MQTT_STATUS_TOPICS
  ? MQTT_STATUS_TOPICS.split(',').map((topic) => topic.trim()).filter(Boolean)
  : defaultStatusTopics;

// Mapa para armazenar dispositivos descobertos (nao registrados)
const discoveredDevices = new Map();
const DISCOVERY_TIMEOUT = 24 * 60 * 60 * 1000; // 24 horas
const realtimeClients = new Set();

const sendRealtimeEvent = (event) => {
  const payload = `event: ${event.type || 'message'}\ndata: ${JSON.stringify(event)}\n\n`;

  realtimeClients.forEach((client) => {
    try {
      client.write(payload);
    } catch {
      realtimeClients.delete(client);
    }
  });
};

const mqttClient = mqtt.connect(MQTT_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  clientId: MQTT_CLIENT_ID || `smartcontrol-backend-${Math.random().toString(36).slice(2, 8)}`,
  keepalive: 30,
  reconnectPeriod: 5000,
  clean: true,
  rejectUnauthorized: MQTT_REJECT_UNAUTHORIZED !== 'false',
});

const bufferLikeToString = (value) => {
  if (Buffer.isBuffer(value)) return value.toString('utf8');

  if (value instanceof Uint8Array) {
    return Buffer.from(value).toString('utf8');
  }

  if (value?.type === 'Buffer' && Array.isArray(value.data)) {
    return Buffer.from(value.data).toString('utf8');
  }

  return null;
};

const safeJsonParse = (value) => {
  if (!value) return {};
  const bufferText = bufferLikeToString(value);
  if (bufferText !== null) return safeJsonParse(bufferText);
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value.toString());
  } catch {
    return { raw: value.toString() };
  }
};

const parseJsonField = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  return safeJsonParse(value);
};

const shouldRetryWithoutNewColumns = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return message.includes('column') || message.includes('schema') || message.includes('cache');
};

const toBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'on', 'online', 'ligado'].includes(normalized)) return true;
    if (['false', '0', 'off', 'offline', 'desligado'].includes(normalized)) return false;
  }

  return fallback;
};

const maybeBoolean = (value) => {
  if (typeof value === 'undefined' || value === null) return null;
  return toBoolean(value);
};

const toBoundedInteger = (value, { min, max, fallback }) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

const logEvent = async ({ deviceId = null, userId = null, type, payload }) => {
  const logPayload = {
    device_id: deviceId,
    user_id: userId,
    type,
    payload,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('logs').insert([logPayload]);

  if (!error) return;

  const fallback = await supabase.from('logs').insert([{
    ...logPayload,
    payload: JSON.stringify(payload),
  }]);

  if (fallback.error) {
    console.warn('Nao foi possivel gravar log:', fallback.error.message);
  }
};

const safeUpdateDevice = async (deviceId, payload) => {
  const { error } = await supabase
    .from('devices')
    .update(payload)
    .eq('id', deviceId);

  if (!error) return;

  if (!shouldRetryWithoutNewColumns(error)) {
    console.error('Erro ao atualizar dispositivo:', error.message);
    return;
  }

  const fallbackPayload = {};
  if (typeof payload.status === 'boolean') fallbackPayload.status = payload.status;
  if (typeof payload.online === 'boolean') fallbackPayload.online = payload.online;

  if (Object.keys(fallbackPayload).length === 0) return;

  const fallback = await supabase
    .from('devices')
    .update(fallbackPayload)
    .eq('id', deviceId);

  if (fallback.error) {
    console.error('Erro ao atualizar fallback do dispositivo:', fallback.error.message);
  }
};

const findDeviceByIdentity = async ({ topicRoot, dbId, deviceId, macAddress }) => {
  if (topicRoot) {
    const { data } = await supabase.from('devices').select('*').eq('mqtt_topic', topicRoot).maybeSingle();
    if (data) return data;
  }

  if (dbId) {
    const { data } = await supabase.from('devices').select('*').eq('id', dbId).maybeSingle();
    if (data) return data;
  }

  if (deviceId) {
    const { data } = await supabase.from('devices').select('*').eq('device_id', deviceId).maybeSingle();
    if (data) return data;
  }

  if (macAddress) {
    const { data } = await supabase.from('devices').select('*').eq('mac_address', macAddress).maybeSingle();
    if (data) return data;
  }

  return null;
};

const extractIdentity = (topic, payload) => {
  const parts = topic.split('/');
  const topicRoot = normalizeTopicRoot(topic);
  const deviceFromTopic = parts.length >= 4 && parts[0] === 'smartcontrol' ? parts[3] : null;

  return {
    topicRoot,
    dbId: payload.smartcontrol_db_id || payload.db_id || null,
    deviceId: payload.device_id || payload.deviceId || payload.id || deviceFromTopic,
    macAddress: payload.mac_address || payload.mac || payload.network?.mac || null,
  };
};

const getEventTypeFromTopic = (topic) => topic.split('/').pop();

const hasValidDeviceToken = (device, payload) => {
  if (!device?.device_token) return true;

  const token = payload.device_token || payload.token || payload.auth?.device_token;
  if (!token) return !requireDeviceToken;

  return token === device.device_token;
};

const handleMqttMessage = async (topic, message) => {
  const payload = safeJsonParse(message);
  const eventType = getEventTypeFromTopic(topic);
  const identity = extractIdentity(topic, payload);
  const device = await findDeviceByIdentity(identity);

  if (!device) {
    // Armazenar dispositivo nao registrado para descoberta
    if ((eventType === 'heartbeat' || eventType === 'status' || eventType === 'announce') && payload.device_id) {
      const discoveryKey = payload.device_id || payload.mac_address || topic;
      discoveredDevices.set(discoveryKey, {
        device_id: payload.device_id,
        mac_address: payload.mac_address || payload.mac,
        ip: payload.ip,
        mdns: payload.mdns,
        firmware_version: payload.firmware_version,
        hardware_version: payload.hardware_version,
        module: payload.module,
        topic_root: identity.topicRoot,
        discovered_at: new Date().toISOString(),
        full_payload: payload,
      });

      sendRealtimeEvent({
        type: 'device_discovered',
        device_id: payload.device_id,
        mac_address: payload.mac_address || payload.mac,
        topic,
        topic_root: identity.topicRoot,
        updated_at: new Date().toISOString(),
      });
    }

    await logEvent({
      type: eventType === 'announce' ? 'device_pairing_announce' : 'mqtt_unmatched_message',
      payload: { topic, payload, identity },
    });
    return;
  }

  if (!hasValidDeviceToken(device, payload)) {
    await logEvent({
      deviceId: device.id,
      userId: device.user_id,
      type: 'mqtt_invalid_device_token',
      payload: { topic, identity },
    });
    return;
  }

  const now = new Date().toISOString();
  const availabilityValue = payload.status ?? payload.state ?? payload.online;
  const availabilityOffline =
    eventType === 'availability' &&
    ['offline', 'false', '0'].includes(String(availabilityValue || '').toLowerCase());
  const previousLastState = parseJsonField(device.last_state);
  const previousTelemetry = parseJsonField(device.telemetry);
  const replacesDeviceState = ['status', 'telemetry', 'heartbeat'].includes(eventType);
  const nextLastState = replacesDeviceState
    ? payload
    : {
        ...previousLastState,
        online: !availabilityOffline,
        last_ack: eventType === 'ack' ? payload : previousLastState.last_ack,
        last_availability: eventType === 'availability' ? payload : previousLastState.last_availability,
      };
  const nextTelemetry = replacesDeviceState
    ? payload
    : {
        ...previousTelemetry,
        last_ack: eventType === 'ack' ? payload : previousTelemetry.last_ack,
        last_availability: eventType === 'availability' ? payload : previousTelemetry.last_availability,
      };

  const pumpState = maybeBoolean(payload.v1 ?? payload.relays?.pump ?? payload.pump);
  const nextConfiguration =
    eventType === 'config'
      ? {
          ...parseJsonField(device.configuration),
          remote_config: payload.payload || payload,
          remote_config_received_at: now,
        }
      : undefined;

  const updatePayload = {
    connection_status: availabilityOffline ? 'offline' : 'online',
    online: !availabilityOffline,
    last_heartbeat: now,
    last_state: nextLastState,
    telemetry: nextTelemetry,
  };

  if (pumpState !== null) updatePayload.status = pumpState;
  if (nextConfiguration) updatePayload.configuration = nextConfiguration;
  if (payload.ip || payload.network?.ip) updatePayload.local_ip = payload.ip || payload.network.ip;
  if (payload.mdns || payload.network?.mdns) updatePayload.mdns_hostname = payload.mdns || payload.network.mdns;
  if (payload.mac || payload.network?.mac) updatePayload.mac_address = payload.mac || payload.network.mac;
  if (payload.firmware_version || payload.firmwareVersion) {
    updatePayload.firmware_version = payload.firmware_version || payload.firmwareVersion;
  }
  if (payload.hardware_version || payload.hardwareVersion) {
    updatePayload.hardware_version = payload.hardware_version || payload.hardwareVersion;
  }

  const discoveredTopicRoot = isSmartControlTopicRoot(identity.topicRoot);
  if (discoveredTopicRoot && normalizeTopicRoot(device.mqtt_topic || '') !== discoveredTopicRoot) {
    const healedTopics = buildMqttTopics({ ...device, mqtt_topic: discoveredTopicRoot });
    updatePayload.mqtt_topic = discoveredTopicRoot;
    updatePayload.configuration = {
      ...parseJsonField(device.configuration),
      ...(updatePayload.configuration || {}),
      mqtt_topics: healedTopics,
      discovered_topic_root: discoveredTopicRoot,
      discovered_topic_root_at: now,
    };
  }

  await safeUpdateDevice(device.id, updatePayload);

  sendRealtimeEvent({
    type: 'device_state',
    device_id: device.id,
    external_device_id: device.device_id || identity.deviceId,
    user_id: device.user_id,
    event_type: eventType,
    topic,
    payload,
    updated_at: now,
  });

  await logEvent({
    deviceId: device.id,
    userId: device.user_id,
    type: `mqtt_${eventType}`,
    payload: { topic, payload },
  });
};

mqttClient.on('connect', () => {
  console.log('MQTT backend conectado ao broker.');
  mqttClient.subscribe(statusTopics, { qos: 1 }, (error) => {
    if (error) {
      console.error('Erro ao assinar topicos MQTT:', error.message);
      return;
    }
    console.log('Topicos MQTT assinados:', statusTopics.join(', '));
  });
});

mqttClient.on('message', (topic, message) => {
  handleMqttMessage(topic, message).catch((error) => {
    console.error('Erro ao processar mensagem MQTT:', error);
  });
});

mqttClient.on('reconnect', () => {
  console.log('Reconectando ao broker MQTT...');
});

mqttClient.on('error', (error) => {
  console.error('Erro MQTT:', error?.message || error);
});

const validateHydroponicsCommand = ({ command, payload }) => {
  switch (command) {
    case 'set_auto': {
      const enabled = toBoolean(payload.enabled ?? payload.automatic ?? payload.t24 ?? payload.value);
      return { command, payload: { enabled, automatic: enabled, t24: enabled, value: enabled } };
    }

    case 'set_relay': {
      const relay = String(payload.relay || '').trim();
      if (!['pump', 'oxygenator'].includes(relay)) {
        throw new Error('Relay invalido. Use pump ou oxygenator.');
      }
      const value = toBoolean(payload.value ?? payload.state ?? payload.enabled);
      const relayStateKey = relay === 'pump' ? 'v1' : 'v2';
      return { command, payload: { relay, value, [relayStateKey]: value } };
    }

    case 'set_timers': {
      const tOn = toBoundedInteger(payload.tOn, { min: 1, max: 1440, fallback: null });
      const tOff = toBoundedInteger(payload.tOff, { min: 1, max: 1440, fallback: null });
      if (!tOn || !tOff) {
        throw new Error('Tempos invalidos. Use valores entre 1 e 1440 minutos.');
      }
      return { command, payload: { tOn, tOff } };
    }

    case 'request_status':
      return { command, payload: {} };

    case 'factory_reset':
      if (payload.confirm !== true) {
        throw new Error('factory_reset exige payload.confirm=true.');
      }
      return { command, payload: { confirm: true } };

    default:
      throw new Error('Comando de hidroponia nao permitido.');
  }
};

const validateHydroponicsConfig = (payload = {}) => {
  const config = {};

  if (Object.hasOwn(payload, 'enabled') || Object.hasOwn(payload, 'automatic')) {
    config.enabled = toBoolean(payload.enabled ?? payload.automatic);
  }

  if (Object.hasOwn(payload, 'tOn')) {
    config.tOn = toBoundedInteger(payload.tOn, { min: 1, max: 1440, fallback: 10 });
  }

  if (Object.hasOwn(payload, 'tOff')) {
    config.tOff = toBoundedInteger(payload.tOff, { min: 1, max: 1440, fallback: 10 });
  }

  if (Object.keys(config).length === 0) {
    throw new Error('Envie ao menos enabled/automatic, tOn ou tOff.');
  }

  return config;
};

const normalizeCommand = ({ command, payload = {}, module }, device) => {
  const commandObject = typeof command === 'object' && command !== null ? command : { command, payload, module };
  const normalizedCommand = String(commandObject.command || '').trim();
  const normalizedPayload = commandObject.payload || payload || {};
  const normalizedModule = commandObject.module || module || device.module_type || device.device_model || 'generic_iot';
  const isHydroponics =
    normalizedModule === 'heltec_esp32_lora_hydroponics' ||
    device.module_type === 'heltec_esp32_lora_hydroponics' ||
    device.device_model === 'heltec_esp32_lora_hydroponics' ||
    device.type === 'hydroponics';

  if (!normalizedCommand) {
    throw new Error('Comando vazio.');
  }

  if (isHydroponics) {
    const validated = validateHydroponicsCommand({
      command: normalizedCommand,
      payload: normalizedPayload,
    });
    return { ...validated, module: 'heltec_esp32_lora_hydroponics' };
  }

  const genericCommands = [
    'toggle',
    'on',
    'off',
    'status',
    'request_status',
    'open',
    'close',
    'start_zone',
    'stop_zone',
    'set_schedule',
  ];
  if (!genericCommands.includes(normalizedCommand)) {
    throw new Error('Comando generico nao permitido.');
  }

  return { command: normalizedCommand, payload: normalizedPayload, module: normalizedModule };
};

const getRequestUser = async (req) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;

  return data.user || null;
};

const resolveAuthorizedDevice = async (req, res, lookup) => {
  const requestUser = await getRequestUser(req);

  if (requireAuth && !requestUser) {
    res.status(401).json({ error: 'Autenticacao obrigatoria.' });
    return null;
  }

  const device = await findDeviceByIdentity(lookup);

  if (!device) {
    res.status(404).json({ error: 'Dispositivo nao encontrado.' });
    return null;
  }

  const bodyUserId = req.body?.user_id || req.query?.user_id || null;
  const requestUserId = requestUser?.id || bodyUserId || null;

  if (device.user_id && requestUserId && device.user_id !== requestUserId) {
    res.status(403).json({ error: 'Dispositivo pertence a outro usuario.' });
    return null;
  }

  if (requireAuth && device.user_id && requestUser?.id !== device.user_id) {
    res.status(403).json({ error: 'Dispositivo pertence a outro usuario.' });
    return null;
  }

  return {
    device,
    requestUser,
    userId: requestUser?.id || bodyUserId || device.user_id || null,
  };
};

const publishJson = async (topic, payload, options = {}) => {
  if (!mqttClient.connected) {
    const error = new Error('Backend MQTT offline. Tente novamente quando /health indicar mqtt_connected=true.');
    error.statusCode = 503;
    throw error;
  }

  await new Promise((resolve, reject) => {
    mqttClient.publish(
      topic,
      JSON.stringify(payload),
      { qos: options.qos ?? 1, retain: options.retain ?? false },
      (error) => {
        if (error) reject(error);
        else resolve();
      },
    );
  });
};

const publishCommandForDevice = async ({ device, command, payload, module, userId }) => {
  const topics = buildMqttTopics(device);
  const requestId = randomUUID();
  const mqttPayload = {
    protocol: 'smartcontrol.mqtt.v1',
    request_id: requestId,
    module,
    device_id: device.device_id || device.id,
    command,
    payload,
    sent_at: new Date().toISOString(),
    user_id: userId || null,
  };

  await publishJson(topics.command, mqttPayload, { qos: 1, retain: false });

  if (module === 'heltec_esp32_lora_hydroponics' && command === 'set_auto') {
    await publishJson(
      topics.config,
      {
        ...mqttPayload,
        command: 'set_config',
        payload: {
          enabled: payload.enabled,
          automatic: payload.enabled,
          t24: payload.enabled,
        },
      },
      { qos: 1, retain: false },
    );
  }

  await logEvent({
    deviceId: device.id,
    userId,
    type: 'command_sent',
    payload: { topic: topics.command, payload: mqttPayload },
  });

  return { status: 'sent', topic: topics.command, payload: mqttPayload };
};

const publishConfigForDevice = async ({ device, config, userId }) => {
  const topics = buildMqttTopics(device);
  const requestId = randomUUID();
  const mqttPayload = {
    protocol: 'smartcontrol.mqtt.v1',
    request_id: requestId,
    module: device.module_type || device.device_model || 'generic_iot',
    device_id: device.device_id || device.id,
    command: 'set_config',
    payload: config,
    sent_at: new Date().toISOString(),
    user_id: userId || null,
  };

  await publishJson(topics.config, mqttPayload, { qos: 1, retain: true });

  await safeUpdateDevice(device.id, {
    configuration: {
      ...parseJsonField(device.configuration),
      mqtt_topics: topics,
      pending_remote_config: config,
      pending_remote_config_at: mqttPayload.sent_at,
    },
  });

  await logEvent({
    deviceId: device.id,
    userId,
    type: 'config_sent',
    payload: { topic: topics.config, payload: mqttPayload },
  });

  return { status: 'sent', topic: topics.config, payload: mqttPayload };
};

const app = express();
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (CORS_ORIGIN || '').split(',').map((item) => item.trim()).filter(Boolean);
    if (!origin || allowed.length === 0 || allowed.includes('*') || allowed.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origem nao permitida pelo CORS.'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => {
  return res.json({
    service: 'SmartControl MQTT Backend',
    status: 'online',
    health: '/health',
  });
});

app.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    version: '1.3.1',
    mqtt_connected: mqttClient.connected,
    subscribed_topics: statusTopics,
    auth_required: requireAuth,
    device_token_required: requireDeviceToken,
  });
});

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`event: connected\ndata: ${JSON.stringify({
    type: 'connected',
    mqtt_connected: mqttClient.connected,
    updated_at: new Date().toISOString(),
  })}\n\n`);

  realtimeClients.add(res);

  const keepAlive = setInterval(() => {
    res.write(`event: ping\ndata: ${JSON.stringify({
      type: 'ping',
      updated_at: new Date().toISOString(),
    })}\n\n`);
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    realtimeClients.delete(res);
  });
});

app.get('/api/devices/:id/topics', async (req, res) => {
  const resolved = await resolveAuthorizedDevice(req, res, { dbId: req.params.id, deviceId: req.params.id });
  if (!resolved) return;

  return res.json({
    device_id: resolved.device.device_id || resolved.device.id,
    topics: buildMqttTopics(resolved.device),
  });
});

app.get('/api/devices/:id/state', async (req, res) => {
  const resolved = await resolveAuthorizedDevice(req, res, { dbId: req.params.id, deviceId: req.params.id });
  if (!resolved) return;

  return res.json({
    device: resolved.device,
    state: parseJsonField(resolved.device.last_state),
    telemetry: parseJsonField(resolved.device.telemetry),
    topics: buildMqttTopics(resolved.device),
  });
});

app.get('/api/devices/:id/logs', async (req, res) => {
  const resolved = await resolveAuthorizedDevice(req, res, { dbId: req.params.id, deviceId: req.params.id });
  if (!resolved) return;

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .eq('device_id', resolved.device.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({ logs: data || [] });
});

app.post('/api/command', async (req, res) => {
  const { device_id: requestDeviceId, command, payload, module, device_token: deviceToken } = req.body;

  if (!requestDeviceId || !command) {
    return res.status(400).json({ error: 'device_id e command sao obrigatorios.' });
  }

  try {
    const resolved = await resolveAuthorizedDevice(req, res, { dbId: requestDeviceId, deviceId: requestDeviceId });
    if (!resolved) return;

    if (deviceToken && resolved.device.device_token && deviceToken !== resolved.device.device_token) {
      return res.status(403).json({ error: 'Token de dispositivo invalido.' });
    }

    const normalized = normalizeCommand({ command, payload, module }, resolved.device);
    const result = await publishCommandForDevice({
      device: resolved.device,
      ...normalized,
      userId: resolved.userId,
    });

    return res.json(result);
  } catch (error) {
    console.error('Erro no backend de comando:', error);
    return res.status(error.statusCode || 400).json({ error: error.message || 'Erro interno no backend de integracao.' });
  }
});

app.post('/api/devices/:id/config', async (req, res) => {
  try {
    const resolved = await resolveAuthorizedDevice(req, res, { dbId: req.params.id, deviceId: req.params.id });
    if (!resolved) return;

    const isHydroponics =
      resolved.device.module_type === 'heltec_esp32_lora_hydroponics' ||
      resolved.device.device_model === 'heltec_esp32_lora_hydroponics' ||
      resolved.device.type === 'hydroponics';

    const config = isHydroponics ? validateHydroponicsConfig(req.body || {}) : req.body || {};
    const result = await publishConfigForDevice({
      device: resolved.device,
      config,
      userId: resolved.userId,
    });

    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }
});

app.post('/api/devices/:id/request-status', async (req, res) => {
  try {
    const resolved = await resolveAuthorizedDevice(req, res, { dbId: req.params.id, deviceId: req.params.id });
    if (!resolved) return;

    const normalized = normalizeCommand({ command: 'request_status', payload: {} }, resolved.device);
    const result = await publishCommandForDevice({
      device: resolved.device,
      ...normalized,
      userId: resolved.userId,
    });

    return res.json(result);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message });
  }
});

app.get('/api/discover/devices', (req, res) => {
  const devices = Array.from(discoveredDevices.values());
  return res.json({ devices, count: devices.length });
});

app.get('/api/discover/devices/:deviceId', (req, res) => {
  const device = discoveredDevices.get(req.params.deviceId);
  if (!device) {
    return res.status(404).json({ error: 'Dispositivo nao encontrado' });
  }
  return res.json(device);
});

app.listen(PORT, () => {
  console.log(`SmartControl backend rodando na porta ${PORT}`);
});
