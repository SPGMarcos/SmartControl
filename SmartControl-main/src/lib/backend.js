const DEFAULT_BACKEND_URL = 'https://smartcontrol-backend-2zvt.onrender.com';

const configuredBackendUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
const isLocalBackendUrl = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(configuredBackendUrl);
const isLocalFrontend =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

export const backendUrl =
  configuredBackendUrl && (!isLocalBackendUrl || isLocalFrontend) ? configuredBackendUrl : DEFAULT_BACKEND_URL;
