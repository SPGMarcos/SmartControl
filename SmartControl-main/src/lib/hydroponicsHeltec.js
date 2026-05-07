import { buildMqttTopics } from '@/lib/mqttTopics';

export const HYDROPONICS_MODULE_TYPE = 'heltec_esp32_lora_hydroponics';
export const HYDROPONICS_ESP32_MODULE_TYPE = 'esp32_devkit_hydroponics';
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

const bufferLikeToString = (value) => {
  if (value?.type === 'Buffer' && Array.isArray(value.data)) {
    return String.fromCharCode(...value.data);
  }

  if (value instanceof Uint8Array) {
    return new TextDecoder().decode(value);
  }

  return null;
};

const parseJsonField = (value) => {
  if (!value) return {};
  const bufferText = bufferLikeToString(value);
  if (bufferText !== null) return parseJsonField(bufferText);
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
    device.module_type === HYDROPONICS_ESP32_MODULE_TYPE ||
    device.device_model === HYDROPONICS_MODULE_TYPE ||
    device.device_model === HYDROPONICS_ESP32_MODULE_TYPE ||
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
    moduleType: device.module_type || device.module || device.device_model || HYDROPONICS_ESP32_MODULE_TYPE,
    online: toBoolean(device.connection_status, false) || toBoolean(state.online, false),
    t24: toBoolean(state.t24 ?? state.automatic ?? state.auto ?? state.mode?.automatic, false),
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
    hardwareVersion: state.modelo || state.model || state.hardware || state.hardware_version || device.hardware_version || 'ESP32',
    capabilities: capabilities?.relays ? capabilities : HYDROPONICS_CAPABILITIES,
    lastSeen: device.last_heartbeat || state.last_seen || device.updated_at || device.created_at,
    updatedAt: device.updated_at || state.updated_at || device.last_heartbeat || device.created_at,
    lastAck: state.last_ack || telemetry.last_ack || lastState.last_ack || null,
    pendingCommand: state.pending_command || telemetry.pending_command || lastState.pending_command || null,
    pendingRequestId: state.pending_request_id || telemetry.pending_request_id || lastState.pending_request_id || '',
    pendingCommandAt: state.pending_command_at || telemetry.pending_command_at || lastState.pending_command_at || null,
    lastCommandStatus: state.last_command_status || telemetry.last_command_status || lastState.last_command_status || '',
    lastCommandReason: state.last_command_reason || telemetry.last_command_reason || lastState.last_command_reason || '',
  };
};

export const formatHydroponicsTimer = (seconds = 0) => {
  const safeSeconds = Math.max(0, toNumber(seconds, 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const getHydroponicsCycleSnapshot = (device = {}, now = Date.now()) => {
  const state = normalizeHydroponicsState(device);
  const lastSeenTime = state.lastSeen ? new Date(state.lastSeen).getTime() : now;
  const ageSeconds = Number.isFinite(lastSeenTime)
    ? Math.max(0, Math.floor((now - lastSeenTime) / 1000))
    : 0;
  let pumpActive = state.v1;
  let remainingSeconds = Math.max(0, toNumber(state.rem, 0)) - ageSeconds;
  let guard = 0;

  while (state.t24 && remainingSeconds <= 0 && guard < 8) {
    pumpActive = !pumpActive;
    remainingSeconds += Math.max(1, toNumber(pumpActive ? state.tOn : state.tOff, 1)) * 60;
    guard += 1;
  }

  const durationSeconds = Math.max(1, toNumber(pumpActive ? state.tOn : state.tOff, 1)) * 60;
  const normalizedRemaining = state.t24 ? Math.max(0, remainingSeconds) : 0;

  return {
    automatic: state.t24,
    phase: pumpActive ? 'on' : 'off',
    pumpActive,
    remainingSeconds: normalizedRemaining,
    durationSeconds,
    elapsedSeconds: state.t24
      ? Math.min(durationSeconds, Math.max(0, durationSeconds - normalizedRemaining))
      : 0,
  };
};

export const buildBalancedHydroponicsTimerPayload = (device = {}, timers = {}, now = Date.now()) => {
  const current = normalizeHydroponicsState(device);
  const snapshot = getHydroponicsCycleSnapshot(device, now);
  const tOn = Math.max(1, toNumber(timers.tOn, current.tOn));
  const tOff = Math.max(1, toNumber(timers.tOff, current.tOff));
  const nextDurationSeconds = Math.max(1, snapshot.phase === 'on' ? tOn : tOff) * 60;
  const elapsedSeconds = Math.min(snapshot.elapsedSeconds, nextDurationSeconds);
  const remainingSeconds = snapshot.automatic
    ? Math.max(1, nextDurationSeconds - elapsedSeconds)
    : 0;

  return {
    tOn,
    tOff,
    preserveCycle: true,
    phase: snapshot.phase,
    elapsedSeconds,
    currentDurationSeconds: snapshot.durationSeconds,
    newDurationSeconds: nextDurationSeconds,
    remainingSeconds,
    rem: remainingSeconds,
  };
};

export const buildHydroponicsCommand = (command, payload = {}, device = {}) => ({
  module: device.module_type || device.module || device.device_model || HYDROPONICS_ESP32_MODULE_TYPE,
  command,
  payload,
  source: 'smartcontrol-web',
  created_at: new Date().toISOString(),
  requiresStateConfirmation: command === 'set_auto',
});

export const applyHydroponicsCommandState = (device = {}, commandPayload = {}) => {
  const command = commandPayload?.command;
  const payload = commandPayload?.payload || {};
  const current = normalizeHydroponicsState(device);
  const patch = {};
  const snapshot = getHydroponicsCycleSnapshot(device);
  const getBalancedRemaining = (nextTOn = current.tOn, nextTOff = current.tOff) => {
    const explicitRemaining = toNumber(payload.remainingSeconds ?? payload.remaining_seconds ?? payload.rem, NaN);
    if (Number.isFinite(explicitRemaining)) return Math.max(0, explicitRemaining);

    const nextDurationSeconds = Math.max(1, snapshot.phase === 'on' ? nextTOn : nextTOff) * 60;
    const elapsedSeconds = Math.min(snapshot.elapsedSeconds, nextDurationSeconds);
    return Math.max(1, nextDurationSeconds - elapsedSeconds);
  };

  if (commandPayload?.useConfigTopic) {
    if (payload.tOn !== undefined) patch.tOn = toNumber(payload.tOn, current.tOn);
    if (payload.tOff !== undefined) patch.tOff = toNumber(payload.tOff, current.tOff);
    if (current.t24 && (payload.tOn !== undefined || payload.tOff !== undefined)) {
      patch.rem = getBalancedRemaining(patch.tOn ?? current.tOn, patch.tOff ?? current.tOff);
    }
  }

  if (command === 'set_auto') {
    patch.t24 = toBoolean(payload.enabled, current.t24);
    if (patch.t24) {
      patch.v1 = true;
      patch.v2 = true;
      patch.rem = current.tOn * 60;
    } else {
      patch.rem = 0;
    }
  }

  if (command === 'set_relay') {
    patch.t24 = false;
    patch.rem = 0;
    if (payload.relay === 'pump') patch.v1 = toBoolean(payload.value, current.v1);
    if (payload.relay === 'oxygenator') patch.v2 = toBoolean(payload.value, current.v2);
  }

  if (command === 'set_timers') {
    patch.tOn = toNumber(payload.tOn, current.tOn);
    patch.tOff = toNumber(payload.tOff, current.tOff);
    patch.rem = current.t24 ? getBalancedRemaining(patch.tOn, patch.tOff) : 0;
  }

  if (Object.keys(patch).length === 0) return device;

  const now = new Date().toISOString();
  const previousLastState = parseJsonField(device.last_state);
  const lastState = {
    ...previousLastState,
    pending_command: command || (commandPayload?.useConfigTopic ? 'set_config' : previousLastState.pending_command),
    pending_command_at: now,
    ...patch,
  };

  return {
    ...device,
    status: typeof patch.v1 === 'boolean' ? patch.v1 : device.status,
    updated_at: now,
    last_state: lastState,
    telemetry: {
      ...parseJsonField(device.telemetry),
      ...lastState,
    },
  };
};

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
