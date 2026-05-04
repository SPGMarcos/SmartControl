const DEFAULT_BACKEND_URL = 'https://smartcontrol-backend-2zvt.onrender.com';

export const backendUrl = (import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
