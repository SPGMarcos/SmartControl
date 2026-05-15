const providerDefinitions = {
  smartcontrol_mqtt: {
    label: 'SmartControl MQTT',
    protocols: ['mqtt', 'mqtt_discovery'],
    capabilities: ['discover', 'provision', 'control', 'telemetry', 'availability'],
    domains: ['switch', 'sensor', 'binary_sensor', 'camera', 'cover', 'light'],
  },
  alexa: {
    label: 'Alexa',
    protocols: ['cloud'],
    capabilities: ['discover', 'control', 'sync_state'],
    domains: ['switch', 'light', 'cover', 'sensor'],
  },
  google_home: {
    label: 'Google Home',
    protocols: ['cloud'],
    capabilities: ['discover', 'control', 'sync_state'],
  },
  tuya: {
    label: 'Tuya',
    protocols: ['cloud', 'lan'],
    capabilities: ['discover', 'control', 'sync_state'],
    domains: ['switch', 'light', 'cover', 'sensor', 'camera'],
  },
  esphome: {
    label: 'ESPHome',
    protocols: ['native_api', 'mqtt'],
    capabilities: ['discover', 'control', 'telemetry'],
    domains: ['switch', 'sensor', 'binary_sensor', 'light', 'cover'],
  },
  home_assistant: {
    label: 'Home Assistant',
    protocols: ['rest', 'websocket', 'mqtt'],
    capabilities: ['import', 'control', 'automation', 'telemetry'],
    domains: ['*'],
  },
  mqtt_generic: {
    label: 'MQTT generico',
    protocols: ['mqtt', 'mqtt_discovery'],
    capabilities: ['import', 'discover', 'control', 'telemetry', 'availability'],
    domains: ['switch', 'sensor', 'binary_sensor', 'camera', 'cover', 'light'],
  },
  camera_ip: {
    label: 'Camera IP',
    protocols: ['rtsp', 'onvif', 'http'],
    capabilities: ['stream', 'snapshot', 'discover', 'ptz'],
    domains: ['camera'],
  },
};

export const UNIVERSAL_DEVICE_MODEL = {
  device: {
    identity: ['id', 'external_ref', 'manufacturer', 'model', 'serial', 'mac_address'],
    availability: ['last_seen_at', 'connection_status', 'source', 'timeout_ms'],
  },
  entities: ['switch', 'sensor', 'binary_sensor', 'camera', 'cover', 'light', 'number', 'select'],
  capabilities: ['turn_on', 'turn_off', 'toggle', 'set_value', 'open', 'close', 'stream', 'snapshot'],
  integrations: Object.keys(providerDefinitions),
};

const notConfigured = (provider) => ({
  provider,
  configured: false,
  devices: [],
  message: 'Adaptador registrado. Configure credenciais/endpoints para ativar descoberta e controle.',
});

export const integrationManager = {
  listProviders() {
    return Object.entries(providerDefinitions).map(([id, definition]) => ({
      id,
      ...definition,
      configured: false,
    }));
  },

  getUniversalModel() {
    return UNIVERSAL_DEVICE_MODEL;
  },

  getProvider(provider) {
    const definition = providerDefinitions[provider];
    if (!definition) return null;
    return { id: provider, ...definition, configured: false };
  },

  async discover(provider) {
    if (!providerDefinitions[provider]) return null;
    return notConfigured(provider);
  },

  async sendCommand(provider, command) {
    if (!providerDefinitions[provider]) return null;
    return {
      provider,
      accepted: false,
      command,
      message: 'Adaptador ainda nao configurado para envio externo.',
    };
  },
};
