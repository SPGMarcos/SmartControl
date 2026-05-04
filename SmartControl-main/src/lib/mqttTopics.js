export const normalizeTopicPart = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const buildMqttTopics = ({ client, project, deviceId, customTopic }) => {
  if (customTopic && typeof customTopic === 'string' && customTopic.trim()) {
    const baseTopic = customTopic
      .trim()
      .replace(/\/+$/, '')
      .replace(/\/(cmd|status|telemetry|config|heartbeat|ack|availability)$/i, '');
    return {
      root: baseTopic,
      command: `${baseTopic}/cmd`,
      status: `${baseTopic}/status`,
      telemetry: `${baseTopic}/telemetry`,
      config: `${baseTopic}/config`,
      heartbeat: `${baseTopic}/heartbeat`,
      ack: `${baseTopic}/ack`,
      availability: `${baseTopic}/availability`,
    };
  }

  const clientPart = normalizeTopicPart(client || 'smartcontrol');
  const projectPart = normalizeTopicPart(project || 'default');
  const devicePart = normalizeTopicPart(deviceId || 'device');
  const baseTopic = `smartcontrol/${clientPart}/${projectPart}/${devicePart}`;

  return {
    root: baseTopic,
    command: `${baseTopic}/cmd`,
    status: `${baseTopic}/status`,
    telemetry: `${baseTopic}/telemetry`,
    config: `${baseTopic}/config`,
    heartbeat: `${baseTopic}/heartbeat`,
    ack: `${baseTopic}/ack`,
    availability: `${baseTopic}/availability`,
  };
};

export const generateDeviceToken = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `dev-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
};

export const buildDeviceExternalId = ({ name, uniqueSuffix }) => {
  const normalizedName = normalizeTopicPart(name || 'smartdevice');
  const suffix = uniqueSuffix || Math.random().toString(36).slice(2, 6);
  return `${normalizedName}-${suffix}`;
};

export const buildPairingTopic = (pairingToken) => {
  const tokenPart = normalizeTopicPart(pairingToken || 'pending');
  return `smartcontrol/pairing/${tokenPart}/announce`;
};

export const SMARTCONTROL_MQTT_EVENTS = {
  command: 'cmd',
  status: 'status',
  telemetry: 'telemetry',
  heartbeat: 'heartbeat',
  config: 'config',
  ack: 'ack',
  availability: 'availability',
};
