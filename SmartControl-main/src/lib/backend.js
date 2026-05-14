const DEFAULT_BACKEND_URL = 'https://smartcontrol-backend-2zvt.onrender.com';

const normalizeBackendUrl = (value = '') =>
  String(value || '')
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '');

const configuredBackendUrl = normalizeBackendUrl(import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || '');
const isLocalBackendUrl = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(configuredBackendUrl);
const isLocalFrontend =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

export const backendUrl =
  configuredBackendUrl && (!isLocalBackendUrl || isLocalFrontend) ? configuredBackendUrl : DEFAULT_BACKEND_URL;
