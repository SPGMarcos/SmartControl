import { backendUrl } from '@/lib/backend';

export const subscribeBackendEvents = ({ onDeviceState, onDeviceDiscovered, onError } = {}) => {
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

  source.addEventListener('device_state', (event) => {
    const payload = parseEvent(event);
    if (payload) onDeviceState?.(payload);
  });

  source.addEventListener('device_discovered', (event) => {
    const payload = parseEvent(event);
    if (payload) onDeviceDiscovered?.(payload);
  });

  source.onerror = (error) => {
    onError?.(error);
  };

  return () => {
    source.close();
  };
};
