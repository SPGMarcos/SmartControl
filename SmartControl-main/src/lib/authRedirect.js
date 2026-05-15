export const getAppBaseUrl = () => {
  if (typeof window === 'undefined') return '';

  const basePath = import.meta.env.BASE_URL || '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

  return `${window.location.origin}${normalizedBasePath}`;
};

export const getAuthCallbackUrl = () => `${getAppBaseUrl()}auth/callback`;

export const getAuthParams = ({ search = '', hash = '' } = {}) => {
  const searchParams = new URLSearchParams(search || '');
  const rawHash = String(hash || '').replace(/^#/, '');
  const hashRouteIndex = rawHash.indexOf('?');
  const hashQuery = hashRouteIndex >= 0 ? rawHash.slice(hashRouteIndex + 1) : rawHash;
  const hashParams = new URLSearchParams(hashQuery);

  const get = (key) => searchParams.get(key) || hashParams.get(key) || '';
  const has = (key) => searchParams.has(key) || hashParams.has(key);

  return {
    code: get('code'),
    type: get('type'),
    accessToken: get('access_token'),
    refreshToken: get('refresh_token'),
    error: get('error'),
    errorDescription: get('error_description'),
    hasAuthSignal: has('code') || has('access_token') || has('refresh_token') || has('type') || has('error'),
  };
};

export const isAuthCallbackPath = (pathname = '') => pathname.endsWith('/auth/callback');
