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

const AuthContext = createContext(undefined);
const SESSION_REMEMBER_KEY = 'smartcontrol.remember_session';
const SESSION_BROWSER_KEY = 'smartcontrol.browser_session_active';
const SESSION_ACTIVITY_KEY = 'smartcontrol.last_activity_at';
const SESSION_IDLE_MS = 10 * 60 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 20 * 1000;

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

const isPasswordRecoveryUrl = () => {
  if (typeof window === 'undefined') return false;

  const search = window.location.search || '';
  const hash = window.location.hash || '';

  return (
    search.includes('reset_password=true') ||
    hash.includes('type=recovery') ||
    hash.includes('access_token')
  );
};

const markSessionPolicy = (rememberSession) => {
  if (typeof window === 'undefined') return;

  const now = String(Date.now());
  setStoredValue(window.localStorage, SESSION_REMEMBER_KEY, rememberSession ? 'true' : 'false');
  setStoredValue(window.sessionStorage, SESSION_BROWSER_KEY, 'true');
  setStoredValue(window.localStorage, SESSION_ACTIVITY_KEY, now);
};

const clearSessionPolicy = () => {
  if (typeof window === 'undefined') return;

  setStoredValue(window.localStorage, SESSION_REMEMBER_KEY, 'false');
  removeStoredValue(window.sessionStorage, SESSION_BROWSER_KEY);
  removeStoredValue(window.localStorage, SESSION_ACTIVITY_KEY);
};

const readLastActivity = () => {
  if (typeof window === 'undefined') return Date.now();
  return Number(getStoredValue(window.localStorage, SESSION_ACTIVITY_KEY) || Date.now());
};

const getPasswordResetRedirectUrl = () => {
  const configuredUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  const publicUrl = import.meta.env.VITE_PUBLIC_APP_URL;
  if (publicUrl) {
    return `${publicUrl.replace(/\/+$/, '')}/login?reset_password=true`;
  }

  const basePath = import.meta.env.BASE_URL || '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

  return `${window.location.origin}${normalizedBasePath}login?reset_password=true`;
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
      const hasBrowserSession = typeof window !== 'undefined'
        ? getStoredValue(window.sessionStorage, SESSION_BROWSER_KEY) === 'true'
        : true;

      if (isPasswordRecoveryUrl()) {
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

    markSessionPolicy(rememberSession);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      clearSessionPolicy();
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

    if (result.error && redirectTo && shouldRetryPasswordResetWithoutRedirect(result.error)) {
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

    const { error } = await supabase.auth.updateUser({
      password,
    });

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
    updatePassword,
    signOut,
  }), [user, session, loading, signUp, signIn, resetPassword, updatePassword, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
