const isLocalUrl = (url) => {
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

const hasHttpProtocol = (url = '') => /^https?:\/\//i.test(url);

const normalizeTrailingSlash = (url = '') => (url.endsWith('/') ? url : `${url}/`);

const getAbsoluteUrl = (value = '') => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (hasHttpProtocol(trimmed)) {
    return normalizeTrailingSlash(trimmed);
  }

  if (typeof window === 'undefined') return '';

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return normalizeTrailingSlash(`${window.location.origin}${normalizedPath}`);
};

const getConfiguredAppBaseUrl = () => {
  const candidates = [
    import.meta.env.VITE_PUBLIC_APP_URL,
    import.meta.env.VITE_FRONTEND_URL,
    import.meta.env.VITE_BASE_URL,
    import.meta.env.VITE_BASE_PATH,
  ];

  for (const candidate of candidates) {
    const absoluteUrl = getAbsoluteUrl(candidate);
    if (!absoluteUrl) continue;
    if (import.meta.env.PROD && isLocalUrl(absoluteUrl)) continue;
    return absoluteUrl;
  }

  return '';
};

export const getAppBaseUrl = () => {
  const configuredUrl = getConfiguredAppBaseUrl();
  if (configuredUrl) return configuredUrl;

  if (typeof window === 'undefined') return '';

  const basePath = import.meta.env.BASE_URL || '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

  return `${window.location.origin}${normalizedBasePath}`;
};

export const getAuthCallbackUrl = () => `${getAppBaseUrl()}auth/callback`;

export const getPasswordResetRedirectUrl = () => {
  const configuredUrl = getAbsoluteUrl(import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL);
  if (configuredUrl && !(import.meta.env.PROD && isLocalUrl(configuredUrl))) {
    return configuredUrl.replace(/\/$/, '');
  }

  return `${getAppBaseUrl()}login?reset_password=true`;
};

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
