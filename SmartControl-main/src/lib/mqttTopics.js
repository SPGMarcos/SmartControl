export const normalizeTopicPart = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const buildMqttTopics = ({ client, project, deviceId, customTopic }) => {
  if (customTopic && typeof customTopic === 'string' && customTopic.trim()) {
    const baseTopic = customTopic.trim().replace(/\/+$/, '');
    return {
      root: baseTopic,
      command: `${baseTopic}/cmd`,
      status: `${baseTopic}/status`,
      telemetry: `${baseTopic}/telemetry`,
      config: `${baseTopic}/config`,
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