const providerDefinitions = {
  alexa: {
    label: 'Alexa',
    protocols: ['cloud'],
    capabilities: ['discover', 'control', 'sync_state'],
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
  },
  esphome: {
    label: 'ESPHome',
    protocols: ['native_api', 'mqtt'],
    capabilities: ['discover', 'control', 'telemetry'],
  },
  home_assistant: {
    label: 'Home Assistant',
    protocols: ['rest', 'websocket', 'mqtt'],
    capabilities: ['import', 'control', 'automation', 'telemetry'],
  },
  mqtt_generic: {
    label: 'MQTT generico',
    protocols: ['mqtt'],
    capabilities: ['import', 'control', 'telemetry'],
  },
  camera_ip: {
    label: 'Camera IP',
    protocols: ['rtsp', 'http'],
    capabilities: ['stream', 'snapshot'],
  },
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
