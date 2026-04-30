const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PASSWORD_MIN_LENGTH = 8;
const LOGIN_LOCK_KEY = 'smartcontrol_login_attempts';
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;

export const normalizeEmail = (email = '') => email.trim().toLowerCase();

export const sanitizeText = (value = '', maxLength = 120) =>
  value
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

export const validateEmail = (email = '') => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return 'Informe seu email.';
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return 'Informe um email válido.';
  }

  return '';
};

export const validatePassword = (password = '') => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }

  if (!/[A-Z]/.test(password)) {
    return 'Inclua pelo menos uma letra maiúscula.';
  }

  if (!/[a-z]/.test(password)) {
    return 'Inclua pelo menos uma letra minúscula.';
  }

  if (!/[0-9]/.test(password)) {
    return 'Inclua pelo menos um número.';
  }

  return '';
};

export const validateDisplayName = (name = '') => {
  const safeName = sanitizeText(name, 80);

  if (safeName.length < 2) {
    return 'Informe seu nome.';
  }

  return '';
};

export const isSessionExpired = (session) => {
  if (!session?.expires_at) return false;
  return session.expires_at * 1000 <= Date.now();
};

export const getSafeAuthErrorMessage = (fallback = 'Não foi possível concluir a operação.') => {
  return fallback;
};

const readLoginState = () => {
  if (typeof window === 'undefined') return { attempts: 0, firstAttemptAt: 0 };

  try {
    return JSON.parse(window.localStorage.getItem(LOGIN_LOCK_KEY)) || { attempts: 0, firstAttemptAt: 0 };
  } catch {
    return { attempts: 0, firstAttemptAt: 0 };
  }
};

const writeLoginState = (state) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOGIN_LOCK_KEY, JSON.stringify(state));
};

export const getLoginLockStatus = () => {
  const state = readLoginState();
  const elapsed = Date.now() - Number(state.firstAttemptAt || 0);

  if (!state.firstAttemptAt || elapsed > LOGIN_WINDOW_MS) {
    return { locked: false, remainingMs: 0 };
  }

  if (Number(state.attempts || 0) >= LOGIN_MAX_ATTEMPTS) {
    return { locked: true, remainingMs: LOGIN_WINDOW_MS - elapsed };
  }

  return { locked: false, remainingMs: 0 };
};

export const registerFailedLoginAttempt = () => {
  const state = readLoginState();
  const elapsed = Date.now() - Number(state.firstAttemptAt || 0);

  if (!state.firstAttemptAt || elapsed > LOGIN_WINDOW_MS) {
    writeLoginState({ attempts: 1, firstAttemptAt: Date.now() });
    return;
  }

  writeLoginState({
    attempts: Number(state.attempts || 0) + 1,
    firstAttemptAt: state.firstAttemptAt,
  });
};

export const clearLoginAttempts = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LOGIN_LOCK_KEY);
};

export const formatLockTime = (milliseconds) => {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60000));
  return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
};
