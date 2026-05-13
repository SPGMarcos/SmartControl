import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getRememberSessionPreference, useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ThemeToggle from '@/components/ThemeToggle';
import { CheckCircle, KeyRound, LogIn, Mail, X } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import {
  PASSWORD_REQUIREMENTS_TEXT,
  clearLoginAttempts,
  formatLockTime,
  getLoginLockStatus,
  normalizeEmail,
  registerFailedLoginAttempt,
  validateEmail,
  validatePassword,
} from '@/lib/security';
import { getSafeRedirectPath } from '@/lib/billing';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetMode, setResetMode] = useState('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [resetError, setResetError] = useState('');
  const [rememberMe, setRememberMe] = useState(() => getRememberSessionPreference());
  const { user, session, signIn, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = getSafeRedirectPath(new URLSearchParams(location.search).get('redirect'), '/dashboard');

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
    const isRecoveryLink =
      urlParams.get('reset_password') === 'true' ||
      urlParams.get('type') === 'recovery' ||
      hashParams.get('type') === 'recovery' ||
      urlParams.has('code') ||
      hashParams.has('access_token');

    if (user && session && !isRecoveryLink) {
      navigate(redirectPath, { replace: true });
    }
  }, [location.hash, location.search, navigate, redirectPath, session, user]);

  useEffect(() => {
    let isMounted = true;
    const urlParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
    const code = urlParams.get('code');
    const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
    const isRecoveryLink =
      urlParams.get('reset_password') === 'true' ||
      urlParams.get('type') === 'recovery' ||
      hashParams.get('type') === 'recovery' ||
      Boolean(code) ||
      Boolean(accessToken);

    if (!isRecoveryLink) return undefined;

    const cleanRecoveryUrl = () => {
      const cleanedParams = new URLSearchParams(location.search);
      ['code', 'type', 'access_token', 'refresh_token', 'expires_at', 'expires_in', 'token_type'].forEach((key) => {
        cleanedParams.delete(key);
      });
      cleanedParams.set('reset_password', 'true');
      navigate(`/login?${cleanedParams.toString()}`, { replace: true });
    };

    const getCurrentSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      return currentSession;
    };

    const prepareRecoverySession = async () => {
      setResetMode('update');
      setResetOpen(true);
      setResetSent(false);
      setResetError('');
      setRecoveryReady(false);
      setRecoveryLoading(true);

      try {
        let currentSession = null;
        let recoveryError = null;

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          currentSession = data?.session || null;
          recoveryError = error || null;

          if (recoveryError) {
            currentSession = await getCurrentSession();
            recoveryError = currentSession ? null : recoveryError;
          }
        } else if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          currentSession = data?.session || null;
          recoveryError = error || null;

          if (recoveryError) {
            currentSession = await getCurrentSession();
            recoveryError = currentSession ? null : recoveryError;
          }
        } else {
          currentSession = await getCurrentSession();
        }

        if (!isMounted) return;

        if (recoveryError || !currentSession) {
          setResetError('Link de recuperacao invalido ou expirado. Solicite um novo email e abra o link mais recente.');
          setRecoveryReady(false);
        } else {
          setRecoveryReady(true);
          setResetError('');

          if (code || accessToken || refreshToken || location.hash) {
            cleanRecoveryUrl();
          }
        }
      } catch {
        if (isMounted) {
          setResetError('Nao foi possivel validar o link de recuperacao. Solicite um novo email e tente novamente.');
          setRecoveryReady(false);
        }
      } finally {
        if (isMounted) setRecoveryLoading(false);
      }
    };

    prepareRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [location.hash, location.search, navigate]);

  useEffect(() => {
    if (!resetOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setResetOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [resetOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    const lockStatus = getLoginLockStatus();
    if (lockStatus.locked) {
      setLoginError(`Muitas tentativas seguidas. Aguarde ${formatLockTime(lockStatus.remainingMs)} para tentar novamente.`);
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);

    if (emailError || !password) {
      setLoginError(emailError || 'Informe sua senha.');
      return;
    }

    setLoading(true);
    const { error } = await signIn(normalizedEmail, password, { remember: rememberMe });
    setLoading(false);
    if (!error) {
      clearLoginAttempts();
    } else {
      registerFailedLoginAttempt();
      setLoginError('Email ou senha inválidos. Confira os dados e tente novamente.');
    }
  };

  const openResetRequest = () => {
    setResetMode('request');
    setResetEmail(email);
    setResetSent(false);
    setResetError('');
    setRecoveryReady(false);
    setRecoveryLoading(false);
    setResetOpen(true);
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setResetError('');

    const normalizedEmail = normalizeEmail(resetEmail);
    const emailError = validateEmail(normalizedEmail);

    if (emailError) {
      setResetError(emailError);
      return;
    }

    setResetLoading(true);
    const { error } = await resetPassword(normalizedEmail);
    setResetLoading(false);

    if (!error) {
      setResetSent(true);
    } else {
      setResetError('Nao foi possivel enviar o link agora. Verifique o email e tente novamente.');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setResetError('');

    const passwordError = validatePassword(newPassword);

    if (passwordError) {
      setResetError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('As senhas digitadas não conferem.');
      return;
    }

    if (!recoveryReady) {
      setResetError('O link de recuperacao ainda nao foi validado. Aguarde alguns segundos ou solicite um novo link.');
      return;
    }

    setUpdateLoading(true);
    const { error } = await updatePassword(newPassword);
    setUpdateLoading(false);

    if (!error) {
      setResetOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      navigate('/dashboard');
    } else {
      setResetError(error?.message || 'Nao foi possivel salvar a nova senha. Abra novamente o link recebido e tente outra vez.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - SmartControl</title>
        <meta name="description" content="Faça login na sua conta SmartControl para acessar seus dispositivos IoT." />
      </Helmet>

      <div className="auth-shell mobile-wrap flex min-h-screen items-center justify-center overflow-x-hidden px-3 py-8 sm:px-4">
        <ThemeToggle className="fixed right-4 top-4 z-20" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="auth-card mobile-card rounded-2xl p-5 sm:p-8">
            <div className="text-center mb-8">
              <h1 className="auth-brand-title text-3xl font-bold mb-2">
                Smart<span className="auth-brand-accent">Control</span>
              </h1>
              <p className="auth-muted">Entre na sua conta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="auth-label">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-2"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="relative">
                <Label htmlFor="password" className="auth-label">Senha</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-2 pr-20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="auth-inline-button absolute right-2 top-9 rounded-md px-2 py-1 text-xs font-medium"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
                <div className="mt-3 text-right">
                  <button
                    type="button"
                    onClick={openResetRequest}
                    className="auth-inline-button text-sm font-medium"
                  >
                    Recuperar senha
                  </button>
                </div>
              </div>

              <label className="auth-soft-panel flex cursor-pointer items-start gap-3 rounded-xl p-3 text-sm">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded accent-purple-600"
                />
                <span>
                  <span className="auth-label block font-medium">Lembrar de mim neste dispositivo</span>
                  <span className="auth-subtle mt-1 block leading-5">
                    Desmarcado, o acesso nao sobrevive ao fechamento do navegador e expira apos 10 minutos sem atividade.
                  </span>
                </span>
              </label>

              {loginError && (
                <div className="auth-alert-danger rounded-xl px-4 py-3 text-sm">
                  {loginError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="auth-muted">
                Não tem uma conta?{' '}
                <Link to="/register" className="auth-link font-medium">
                  Cadastre-se
                </Link>
              </p>
              <Link to="/" className="auth-link text-sm mt-2 inline-block font-medium">
                Voltar para home
              </Link>
            </div>
          </div>
        </motion.div>

        {resetOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-3 py-6 sm:items-center sm:px-4 sm:py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-recovery-title"
          >
            <button
              type="button"
              aria-label="Fechar recuperação de senha"
              className="auth-modal-backdrop absolute inset-0"
              onClick={() => setResetOpen(false)}
            />

            <div className="auth-card relative z-10 max-h-[calc(100vh-3rem)] w-full max-w-lg overflow-y-auto rounded-2xl sm:max-h-[calc(100vh-4rem)]">
              <div className="relative p-4 sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="theme-readable-pill mb-3 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-sm">
                      {resetMode === 'update' ? <KeyRound className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      Segurança da conta
                    </div>
                    <h2 id="password-recovery-title" className="auth-brand-title text-2xl font-bold">
                      {resetMode === 'update' ? 'Definir nova senha' : 'Recuperar senha'}
                    </h2>
                    <p className="auth-muted mt-2 text-sm leading-6">
                      {resetMode === 'update'
                        ? 'Digite uma nova senha para concluir a recuperação da sua conta SmartControl.'
                        : 'Informe seu email e enviaremos um link seguro para redefinir sua senha.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setResetOpen(false)}
                    className="rounded-full border border-[var(--button-outline-border)] bg-[var(--button-outline-bg)] p-2 text-[var(--button-outline-text)] transition hover:border-[var(--accent-purple)] hover:bg-[var(--button-outline-hover)] hover:text-[var(--button-outline-hover-text)]"
                    aria-label="Fechar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {resetError && (
                  <div className="auth-alert-danger mb-4 rounded-xl px-4 py-3 text-sm">
                    {resetError}
                  </div>
                )}

                {resetMode === 'request' ? (
                  resetSent ? (
                    <div className="auth-alert-success rounded-2xl p-5 text-center">
                      <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-400" />
                      <h3 className="font-semibold text-[var(--text-primary)]">Link enviado com segurança</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        Se o email estiver cadastrado, você receberá as instruções para criar uma nova senha.
                      </p>
                      <Button
                        type="button"
                        onClick={() => setResetOpen(false)}
                        className="mt-5"
                      >
                        Entendi
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleResetRequest} className="space-y-5">
                      <div>
                        <Label htmlFor="reset-email" className="auth-label">Email cadastrado</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="mt-2"
                          placeholder="seu@email.com"
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={resetLoading}
                        className="w-full"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {resetLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                      </Button>
                    </form>
                  )
                ) : (
                  <form onSubmit={handlePasswordUpdate} className="space-y-5">
                    {recoveryLoading && (
                      <div className="theme-badge rounded-xl px-4 py-3 text-sm">
                        Validando link de recuperacao...
                      </div>
                    )}

                    <div>
                      <Label htmlFor="new-password" className="auth-label">Nova senha</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-2"
                        placeholder="Mínimo de 8 caracteres"
                        required
                      />
                      <p className="auth-muted mt-2 text-xs leading-5">
                        {PASSWORD_REQUIREMENTS_TEXT}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="confirm-password" className="auth-label">Confirmar nova senha</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-2"
                        placeholder="Repita a nova senha"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={updateLoading || recoveryLoading || !recoveryReady}
                      className="w-full"
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      {recoveryLoading ? 'Validando link...' : updateLoading ? 'Atualizando...' : 'Salvar nova senha'}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Login;
