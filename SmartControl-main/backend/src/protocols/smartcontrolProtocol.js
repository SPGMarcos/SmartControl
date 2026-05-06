const asText = (value = '', maxLength = 160) =>
  String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength);

const boolFromValue = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'on', 'online', 'ligado', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'off', 'offline', 'desligado', 'no'].includes(normalized)) return false;
  }

  return null;
};

export const SMARTCONTROL_PROTOCOL_VERSION = 'smartcontrol.mqtt.v1';

export const normalizeCapabilities = (value = {}) => {
  if (!value) return {};

  if (Array.isArray(value)) {
    return value.reduce((acc, item) => {
      const key = asText(item, 64).toLowerCase();
      if (key) acc[key] = true;
      return acc;
    }, {});
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => asText(item, 64).toLowerCase())
      .filter(Boolean)
      .reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {});
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, rawValue]) => {
      const normalizedKey = asText(key, 64).toLowerCase();
      if (!normalizedKey) return acc;
      const normalizedValue = boolFromValue(rawValue);
      acc[normalizedKey] = normalizedValue === null ? rawValue : normalizedValue;
      return acc;
    }, {});
  }

  return {};
};

export const getAvailabilityState = (eventType, payload = {}) => {
  if (eventType !== 'availability') return null;
  return boolFromValue(payload.status ?? payload.state ?? payload.online);
};

export const getHardwareIdentity = (payload = {}) => {
  const identity = payload.hardware_identity || payload.identity || payload.device_identity || {};
  const hardware = asText(
    payload.hardware ||
      identity.hardware ||
      payload.hardware_type ||
      payload.hardware_version ||
      payload.hardwareVersion,
    100,
  );
  const model = asText(
    payload.modelo ||
      payload.model ||
      payload.model_name ||
      payload.device_model ||
      identity.modelo ||
      identity.model,
    100,
  );
  const lora = boolFromValue(payload.lora ?? payload.has_lora ?? payload.lora_enabled ?? identity.lora ?? identity.has_lora);

  if (!hardware && !model && lora === null) return null;

  return {
    hardware: hardware || null,
    modelo: model || null,
    model: model || null,
    lora,
  };
};

export const normalizeSmartControlPayload = (payload = {}) => {
  const capabilities = normalizeCapabilities(payload.capabilities || payload.capability || payload.features);
  const hardwareIdentity = getHardwareIdentity(payload);
  const protocol = asText(payload.protocol || payload.protocol_version || SMARTCONTROL_PROTOCOL_VERSION, 80);

  return {
    ...payload,
    protocol,
    hardware_identity: hardwareIdentity || payload.hardware_identity,
    capabilities,
  };
};
