import { backendUrl } from '@/lib/backend';

export const subscribeBackendEvents = ({
  onDeviceState,
  onDeviceDiscovered,
  onCommandAck,
  onMqttStatus,
  onConnectionChange,
  onError,
} = {}) => {
  if (!backendUrl || typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
    return () => {};
  }

  let source;

  try {
    source = new window.EventSource(`${backendUrl}/api/events`);
  } catch (error) {
    onError?.(error);
    return () => {};
  }

  const parseEvent = (event) => {
    try {
      return JSON.parse(event.data);
    } catch {
      return null;
    }
  };

  source.onopen = () => {
    onConnectionChange?.({ connected: true, updated_at: new Date().toISOString() });
  };

  source.addEventListener('device_state', (event) => {
    const payload = parseEvent(event);
    if (payload) onDeviceState?.(payload);
  });

  source.addEventListener('device_discovered', (event) => {
    const payload = parseEvent(event);
    if (payload) onDeviceDiscovered?.(payload);
  });

  source.addEventListener('command_ack', (event) => {
    const payload = parseEvent(event);
    if (payload) onCommandAck?.(payload);
  });

  source.addEventListener('mqtt_status', (event) => {
    const payload = parseEvent(event);
    if (payload) onMqttStatus?.(payload);
  });

  source.onerror = (error) => {
    onConnectionChange?.({ connected: false, updated_at: new Date().toISOString() });
    onError?.(error);
  };

  return () => {
    source.close();
  };
};
