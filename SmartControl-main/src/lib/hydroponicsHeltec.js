import { buildMqttTopics } from '@/lib/mqttTopics';

export const HYDROPONICS_MODULE_TYPE = 'heltec_esp32_lora_hydroponics';
export const HYDROPONICS_DEVICE_TYPE = 'hydroponics';
export const HYDROPONICS_DEFAULT_FIRMWARE = 'smartcontrol-hidroponia-1.0.0';

export const HYDROPONICS_CAPABILITIES = {
  relays: [
    { id: 'pump', key: 'v1', label: "Bomba d'Água", pin: 2 },
    { id: 'oxygenator', key: 'v2', label: 'Oxigenador', pin: 17 },
  ],
  modes: ['manual', 'automatic_timer'],
  localEndpoints: ['/', '/status', '/set', '/settings', '/save_mqtt', '/factory_reset'],
  connectivity: ['wifi', 'mdns', 'mqtt', 'ota', 'local_http', 'lora_ready'],
  telemetry: ['remaining_timer', 'relay_state', 'mode', 'ip', 'mac', 'firmware_version', 'heartbeat'],
};

const parseJsonField = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
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

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const isHydroponicsDevice = (device = {}) => {
  const text = [
    device.module_type,
    device.device_model,
    device.model,
    device.type,
    device.name,
    device.project_name,
    device.mqtt_topic,
  ]
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return (
    device.module_type === HYDROPONICS_MODULE_TYPE ||
    device.device_model === HYDROPONICS_MODULE_TYPE ||
    device.type === HYDROPONICS_DEVICE_TYPE ||
    text.includes('hidroponia') ||
    text.includes('hydroponics') ||
    text.includes('heltec')
  );
};

export const normalizeHydroponicsState = (device = {}) => {
  const metadata = parseJsonField(device.metadata);
  const configuration = parseJsonField(device.configuration);
  const capabilities = parseJsonField(device.capabilities);
  const lastState = parseJsonField(device.last_state);
  const telemetry = parseJsonField(device.telemetry);
  const state = {
    ...configuration?.lastState,
    ...metadata?.lastState,
    ...telemetry,
    ...lastState,
  };

  const relays = state.relays || {};
  const timers = state.timers || {};
  const network = state.network || {};

  return {
    moduleType: HYDROPONICS_MODULE_TYPE,
    online: toBoolean(device.connection_status, false) || toBoolean(state.online, false),
    t24: toBoolean(state.t24 ?? state.automatic ?? state.auto ?? state.mode?.automatic, true),
    v1: toBoolean(state.v1 ?? relays.pump ?? state.pump, Boolean(device.status)),
    v2: toBoolean(state.v2 ?? relays.oxygenator ?? state.oxygenator, true),
    rem: toNumber(state.rem ?? state.remaining_seconds ?? timers.remainingSeconds, 0),
    tOn: toNumber(state.tOn ?? state.t_on ?? timers.onMinutes, 10),
    tOff: toNumber(state.tOff ?? state.t_off ?? timers.offMinutes, 10),
    ip: state.ip || network.ip || device.local_ip || configuration.localIp || '',
    mac: state.mac || network.mac || device.mac_address || '',
    mdns: state.mdns || network.mdns || device.mdns_hostname || 'smarthidroponia.local',
    firmwareVersion:
      state.firmware_version ||
      state.firmwareVersion ||
      device.firmware_version ||
      HYDROPONICS_DEFAULT_FIRMWARE,
    hardwareVersion: state.hardware_version || device.hardware_version || 'Heltec ESP32 LoRa V2',
    capabilities: capabilities?.relays ? capabilities : HYDROPONICS_CAPABILITIES,
    lastSeen: device.last_heartbeat || state.last_seen || device.updated_at || device.created_at,
  };
};

export const formatHydroponicsTimer = (seconds = 0) => {
  const safeSeconds = Math.max(0, toNumber(seconds, 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const buildHydroponicsCommand = (command, payload = {}) => ({
  module: HYDROPONICS_MODULE_TYPE,
  command,
  payload,
  source: 'smartcontrol-web',
  created_at: new Date().toISOString(),
});

export const getHydroponicsLocalUrl = (device = {}, path = '/') => {
  const state = normalizeHydroponicsState(device);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (state.ip) return `http://${state.ip}${cleanPath}`;
  if (state.mdns) return `http://${state.mdns}${cleanPath}`;

  return '';
};

export const buildHydroponicsMqttTopics = ({ userId, projectName, device }) =>
  buildMqttTopics({
    client: userId || device?.user_id,
    project: projectName || device?.project_name || 'hidroponia',
    deviceId: device?.device_id || device?.id || 'hidroponia01',
    customTopic: device?.mqtt_topic,
  });
