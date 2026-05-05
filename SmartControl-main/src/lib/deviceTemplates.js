import { HYDROPONICS_DEVICE_TYPE } from '@/lib/hydroponicsHeltec';

export const deviceKindTemplates = [
  { value: 'relay', label: 'Rele / Valvula', dashboard: 'generic-relay', commands: ['on', 'off', 'toggle', 'request_status'] },
  { value: 'light', label: 'Iluminacao', dashboard: 'generic-relay', commands: ['on', 'off', 'toggle', 'request_status'] },
  { value: 'motor', label: 'Motor / Bomba', dashboard: 'generic-relay', commands: ['on', 'off', 'toggle', 'request_status'] },
  { value: 'gate', label: 'Controle de portao', dashboard: 'gate', commands: ['open', 'close', 'toggle', 'request_status'] },
  { value: 'irrigation', label: 'Painel de irrigacao', dashboard: 'irrigation', commands: ['start_zone', 'stop_zone', 'set_schedule', 'request_status'] },
  { value: 'sensor', label: 'Sensor', dashboard: 'sensor', commands: ['request_status'] },
  {
    value: HYDROPONICS_DEVICE_TYPE,
    label: 'Hidroponia inteligente',
    dashboard: 'hydroponics-heltec',
    commands: ['set_auto', 'set_relay', 'set_timers', 'request_status', 'factory_reset'],
  },
];

export const getDeviceKindTemplate = (type) =>
  deviceKindTemplates.find((template) => template.value === type) || deviceKindTemplates[0];
