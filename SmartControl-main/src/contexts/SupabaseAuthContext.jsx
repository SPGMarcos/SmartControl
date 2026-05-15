import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  getSafeAuthErrorMessage,
  isSessionExpired,
  normalizeEmail,
  sanitizeText,
  validateEmail,
  validatePassword,
} from '@/lib/security';
import { getAuthCallbackUrl, isAuthCallbackPath } from '@/lib/authRedirect';

const AuthContext = createContext(undefined);
const SESSION_REMEMBER_KEY = 'smartcontrol.remember_session';
const SESSION_BROWSER_KEY = 'smartcontrol.browser_session_active';
const SESSION_ACTIVITY_KEY = 'smartcontrol.last_activity_at';
const SESSION_IDLE_MS = 10 * 60 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 20 * 1000;
let browserSessionRuntimeActive = false;

const getStoredValue = (storage, key) => {
  if (typeof window === 'undefined') return '';

  try {
    return storage.getItem(key) || '';
  } catch {
    return '';
  }
};

const setStoredValue = (storage, key, value) => {
  if (typeof window === 'undefined') return;

  try {
    storage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private browsing modes.
  }
};

const removeStoredValue = (storage, key) => {
  if (typeof window === 'undefined') return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures.
  }
};

export const getRememberSessionPreference = () => {
  if (typeof window === 'undefined') return false;
  return getStoredValue(window.localStorage, SESSION_REMEMBER_KEY) === 'true';
};

const isAuthActionUrl = () => {
  if (typeof window === 'undefined') return false;

  const search = window.location.search || '';
  const hash = window.location.hash || '';
  const pathname = window.location.pathname || '';

  return (
    isAuthCallbackPath(pathname) ||
    search.includes('reset_password=true') ||
    search.includes('type=recovery') ||
    search.includes('type=signup') ||
    search.includes('code=') ||
    hash.includes('type=recovery') ||
    hash.includes('type=signup') ||
    hash.includes('access_token')
  );
};

const markSessionPolicy = (rememberSession) => {
  if (typeof window === 'undefined') return;

  const now = String(Date.now());
  browserSessionRuntimeActive = true;
  setStoredValue(window.localStorage, SESSION_REMEMBER_KEY, rememberSession ? 'true' : 'false');
  setStoredValue(window.sessionStorage, SESSION_BROWSER_KEY, 'true');
  setStoredValue(window.localStorage, SESSION_ACTIVITY_KEY, now);
};

const clearSessionPolicy = () => {
  if (typeof window === 'undefined') return;

  browserSessionRuntimeActive = false;
  setStoredValue(window.localStorage, SESSION_REMEMBER_KEY, 'false');
  removeStoredValue(window.sessionStorage, SESSION_BROWSER_KEY);
  removeStoredValue(window.localStorage, SESSION_ACTIVITY_KEY);
};

const hasActiveBrowserSession = () => {
  if (typeof window === 'undefined') return true;
  return browserSessionRuntimeActive || getStoredValue(window.sessionStorage, SESSION_BROWSER_KEY) === 'true';
};

const readLastActivity = () => {
  if (typeof window === 'undefined') return Date.now();
  return Number(getStoredValue(window.localStorage, SESSION_ACTIVITY_KEY) || Date.now());
};

const getPasswordResetRedirectUrl = () => {
  const isLocalUrl = (url) => {
    try {
      return ['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname);
    } catch {
      return false;
    }
  };

  const toAbsoluteBaseUrl = (baseUrl) => {
    if (/^https?:\/\//i.test(baseUrl)) return baseUrl;
    const normalizedPath = baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`;
    return `${window.location.origin}${normalizedPath}`;
  };
  const appendResetQuery = (baseUrl) => `${toAbsoluteBaseUrl(baseUrl).replace(/\/+$/, '')}/?reset_password=true`;
  const configuredUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL;

  if (configuredUrl && !(import.meta.env.PROD && isLocalUrl(configuredUrl))) {
    return configuredUrl;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  const frontendUrl =
    import.meta.env.VITE_FRONTEND_URL ||
    import.meta.env.VITE_BASE_URL ||
    import.meta.env.VITE_PUBLIC_APP_URL;

  if (frontendUrl && !(import.meta.env.PROD && isLocalUrl(frontendUrl))) {
    return appendResetQuery(frontendUrl);
  }

  const basePath = import.meta.env.BASE_URL || '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

  return `${window.location.origin}${normalizedBasePath}?reset_password=true`;
};

const shouldRetryPasswordResetWithoutRedirect = (error) => {
  const message = `${error?.message || ''} ${error?.name || ''}`.toLowerCase();

  return (
    message.includes('redirect') ||
    message.includes('not allowed') ||
    message.includes('invalid') ||
    message.includes('url')
  );
};

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastActivityWriteRef = useRef(0);

  const finishLocalSignOut = useCallback(async ({ reason, showErrorToast = false } = {}) => {
    clearSessionPolicy();

    let error = null;
    try {
      const result = await supabase.auth.signOut();
      error = result.error;
    } catch (signOutError) {
      error = signOutError;
    }

    setSession(null);
    setUser(null);
    setLoading(false);

    if (reason === 'idle') {
      toast({
        title: 'Sessao encerrada',
        description: 'Por seguranca, encerramos a sessao apos 10 minutos sem atividade.',
      });
    }

    if (error && showErrorToast) {
      toast({
        variant: 'destructive',
        title: 'Nao foi possivel sair',
        description: 'Tente novamente em alguns instantes.',
      });
    }

    return { error };
  }, [toast]);

  const handleSession = useCallback(async (currentSession) => {
    if (isSessionExpired(currentSession)) {
      await finishLocalSignOut();
      return;
    }

    if (currentSession) {
      const rememberSession = getRememberSessionPreference();
      const hasBrowserSession = hasActiveBrowserSession();

      if (isAuthActionUrl()) {
        markSessionPolicy(false);
      } else if (!rememberSession && !hasBrowserSession) {
        await finishLocalSignOut();
        return;
      } else if (!rememberSession && Date.now() - readLastActivity() > SESSION_IDLE_MS) {
        await finishLocalSignOut({ reason: 'idle' });
        return;
      }
    }

    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    setLoading(false);
  }, [finishLocalSignOut]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      handleSession(currentSession);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        handleSession(currentSession);
      },
    );

    return () => subscription.unsubscribe();
  }, [handleSession]);

  useEffect(() => {
    if (!session || getRememberSessionPreference()) return undefined;

    const writeActivity = () => {
      const now = Date.now();
      if (now - readLastActivity() > SESSION_IDLE_MS) {
        finishLocalSignOut({ reason: 'idle' });
        return;
      }

      if (now - lastActivityWriteRef.current < ACTIVITY_WRITE_THROTTLE_MS) return;

      lastActivityWriteRef.current = now;
      setStoredValue(window.localStorage, SESSION_ACTIVITY_KEY, String(now));
    };

    const checkIdle = () => {
      if (Date.now() - readLastActivity() > SESSION_IDLE_MS) {
        finishLocalSignOut({ reason: 'idle' });
      }
    };

    writeActivity();

    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'pointerdown', 'visibilitychange'];
    events.forEach((eventName) => {
      window.addEventListener(eventName, writeActivity, { passive: true });
    });

    const idleTimer = window.setInterval(checkIdle, 30 * 1000);

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, writeActivity);
      });
      window.clearInterval(idleTimer);
    };
  }, [finishLocalSignOut, session]);

  const signUp = useCallback(async (email, password, options = {}) => {
    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      const message = emailError || passwordError;
      toast({
        variant: 'destructive',
        title: 'Cadastro invalido',
        description: message,
      });
      return { error: { message } };
    }

    const safeOptions = {
      ...options,
      data: {
        ...(options.data || {}),
        full_name: sanitizeText(options.data?.full_name || '', 80),
        role: 'user',
      },
      emailRedirectTo: options.emailRedirectTo || getAuthCallbackUrl(),
    };

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: safeOptions,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Nao foi possivel criar a conta',
        description: getSafeAuthErrorMessage('Revise os dados informados e tente novamente.'),
      });
    }

    return { error };
  }, [toast]);

  const resendConfirmationEmail = useCallback(async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);

    if (emailError) {
      toast({
        variant: 'destructive',
        title: 'Email invalido',
        description: emailError,
      });
      return { error: { message: emailError } };
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
      },
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Nao foi possivel reenviar',
        description: 'Aguarde alguns instantes e tente novamente.',
      });
    } else {
      toast({
        title: 'Email reenviado',
        description: 'Confira sua caixa de entrada e spam.',
      });
    }

    return { error };
  }, [toast]);

  const signIn = useCallback(async (email, password, options = {}) => {
    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);
    const rememberSession = options.remember === true;

    if (emailError || !password) {
      const message = emailError || 'Informe sua senha.';
      toast({
        variant: 'destructive',
        title: 'Login invalido',
        description: message,
      });
      return { error: { message } };
    }

    setLoading(true);
    markSessionPolicy(rememberSession);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      clearSessionPolicy();
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Nao foi possivel entrar',
        description: getSafeAuthErrorMessage('Email ou senha invalidos.'),
      });
    } else {
      await handleSession(data.session);
    }

    return { data, error };
  }, [handleSession, toast]);

  const resetPassword = useCallback(async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);

    if (emailError) {
      toast({
        variant: 'destructive',
        title: 'Email invalido',
        description: emailError,
      });
      return { error: { message: emailError } };
    }

    const redirectTo = getPasswordResetRedirectUrl();
    let result = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      redirectTo ? { redirectTo } : undefined,
    );

    if (result.error && redirectTo && !import.meta.env.PROD && shouldRetryPasswordResetWithoutRedirect(result.error)) {
      result = await supabase.auth.resetPasswordForEmail(normalizedEmail);
    }

    const { error } = result;

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Nao foi possivel enviar o link',
        description: 'Verifique o email informado e tente novamente em alguns instantes.',
      });
    } else {
      toast({
        title: 'Verifique seu email',
        description: 'Se existir uma conta para este email, enviaremos um link seguro para redefinir a senha.',
      });
    }

    return { error };
  }, [toast]);

  const updatePassword = useCallback(async (password) => {
    const passwordError = validatePassword(password);

    if (passwordError) {
      toast({
        variant: 'destructive',
        title: 'Senha invalida',
        description: passwordError,
      });
      return { error: { message: passwordError } };
    }

    const { data: { session: currentSession } } = await supabase.auth.getSession();

    if (!currentSession) {
      const message = 'Sessao de recuperacao expirada. Solicite um novo link de redefinicao.';
      toast({
        variant: 'destructive',
        title: 'Link expirado',
        description: message,
      });
      return { error: { message } };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Nao foi possivel atualizar a senha',
        description: 'Abra novamente o link recebido por email e tente outra vez.',
      });
    } else {
      toast({
        title: 'Senha atualizada',
        description: 'Sua nova senha foi definida com seguranca.',
      });
    }

    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    return finishLocalSignOut({ showErrorToast: true });
  }, [finishLocalSignOut]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signUp,
    signIn,
    resetPassword,
    resendConfirmationEmail,
    updatePassword,
    signOut,
  }), [user, session, loading, signUp, signIn, resetPassword, resendConfirmationEmail, updatePassword, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
