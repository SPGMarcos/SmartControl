export const buildOtaDescriptor = (device = {}) => ({
  device_id: device.device_id || device.id,
  firmware_version: device.firmware_version || null,
  hardware_version: device.hardware_version || null,
  supports_local_ota: true,
  supports_remote_ota: false,
  rollback_supported: false,
  strategy: 'local_first',
});
