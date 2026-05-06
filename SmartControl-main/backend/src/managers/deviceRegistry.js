import { normalizeCapabilities } from '../protocols/smartcontrolProtocol.js';

export const DEVICE_CLASSES = {
  hydroponics: {
    prefix: 'SC-HYDRO',
    label: 'Hidroponia',
    capabilities: {
      relay: true,
      timer: true,
      local_dashboard: true,
      ap: true,
      mqtt: true,
      ota: true,
    },
  },
  irrigation: {
    prefix: 'SC-IRR',
    label: 'Irrigacao',
    capabilities: {
      relay: true,
      schedule: true,
      local_dashboard: true,
      ap: true,
      mqtt: true,
      ota: true,
    },
  },
  greenhouse: {
    prefix: 'SC-GREEN',
    label: 'Estufa',
    capabilities: {
      relay: true,
      sensor_temperature: true,
      sensor_humidity: true,
      local_dashboard: true,
      ap: true,
      mqtt: true,
      ota: true,
    },
  },
  lighting: {
    prefix: 'SC-LIGHT',
    label: 'Iluminacao',
    capabilities: {
      relay: true,
      dimmer: true,
      local_dashboard: true,
      ap: true,
      mqtt: true,
      ota: true,
    },
  },
  water_control: {
    prefix: 'SC-WATER',
    label: 'Controle de agua',
    capabilities: {
      relay: true,
      sensor_level: true,
      local_dashboard: true,
      ap: true,
      mqtt: true,
      ota: true,
    },
  },
  generic: {
    prefix: 'SC-DEVICE',
    label: 'Dispositivo generico',
    capabilities: {
      relay: true,
      local_dashboard: true,
      ap: true,
      mqtt: true,
      ota: true,
    },
  },
};

export const getDeviceClassDefinition = (deviceClass = 'generic') =>
  DEVICE_CLASSES[deviceClass] || DEVICE_CLASSES.generic;

export const mergeCapabilities = (deviceClass, reportedCapabilities = {}) => ({
  ...getDeviceClassDefinition(deviceClass).capabilities,
  ...normalizeCapabilities(reportedCapabilities),
});

export const buildCanonicalIdentity = (payload = {}, fallback = {}) => {
  const deviceClass = payload.category || payload.device_class || fallback.category || fallback.type || 'generic';
  const classDefinition = getDeviceClassDefinition(deviceClass);

  return {
    uuid: payload.uuid || payload.device_uuid || fallback.uuid || null,
    device_id: payload.device_id || fallback.device_id || null,
    type: payload.type || payload.device_type || fallback.type || deviceClass,
    category: deviceClass,
    prefix: classDefinition.prefix,
    firmware: payload.firmware_version || payload.firmware || fallback.firmware_version || null,
    protocol: payload.protocol || 'smartcontrol.mqtt.v1',
    capabilities: mergeCapabilities(deviceClass, payload.capabilities || fallback.capabilities),
  };
};
