import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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

  const handleSession = useCallback(async (currentSession) => {
    if (isSessionExpired(currentSession)) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }

    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    setLoading(false);
  }, []);

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

  const signUp = useCallback(async (email, password, options = {}) => {
    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      const message = emailError || passwordError;
      toast({
        variant: 'destructive',
        title: 'Cadastro inválido',
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
        title: 'Não foi possível criar a conta',
        description: getSafeAuthErrorMessage('Revise os dados informados e tente novamente.'),
      });
    }

    return { error };
  }, [toast]);

  const signIn = useCallback(async (email, password) => {
    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);

    if (emailError || !password) {
      const message = emailError || 'Informe sua senha.';
      toast({
        variant: 'destructive',
        title: 'Login inválido',
        description: message,
      });
      return { error: { message } };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível entrar',
        description: getSafeAuthErrorMessage('Email ou senha inválidos.'),
      });
    }

    return { error };
  }, [toast]);

  const resetPassword = useCallback(async (email) => {
    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);

    if (emailError) {
      toast({
        variant: 'destructive',
        title: 'Email inválido',
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
        title: 'Não foi possível enviar o link',
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
        title: 'Senha inválida',
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
        title: 'Não foi possível atualizar a senha',
        description: 'Abra novamente o link recebido por email e tente outra vez.',
      });
    } else {
      toast({
        title: 'Senha atualizada',
        description: 'Sua nova senha foi definida com segurança.',
      });
    }

    return { error };
  }, [toast]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível sair',
        description: 'Tente novamente em alguns instantes.',
      });
    }

    return { error };
  }, [toast]);

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
