import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ThemeToggle from '@/components/ThemeToggle';
import { CheckCircle, KeyRound, LogIn, Mail, X } from 'lucide-react';
import {
  clearLoginAttempts,
  formatLockTime,
  getLoginLockStatus,
  normalizeEmail,
  registerFailedLoginAttempt,
  validateEmail,
  validatePassword,
} from '@/lib/security';

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
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [resetError, setResetError] = useState('');
  const { signIn, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.replace('#', '?'));

    const isRecoveryLink =
      urlParams.get('reset_password') === 'true' ||
      hashParams.get('type') === 'recovery' ||
      hashParams.get('access_token') !== null;

    if (isRecoveryLink) {
      setResetMode('update');
      setResetOpen(true);
      setResetSent(false);
      setResetError('');
    }
  }, [location.hash, location.search]);

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
    const { error } = await signIn(normalizedEmail, password);
    setLoading(false);
    if (!error) {
      clearLoginAttempts();
      navigate('/dashboard');
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

    setUpdateLoading(true);
    const { error } = await updatePassword(newPassword);
    setUpdateLoading(false);

    if (!error) {
      setResetOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      navigate('/dashboard');
    } else {
      setResetError('Nao foi possivel salvar a nova senha. Abra novamente o link recebido e tente outra vez.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - SmartControl</title>
        <meta name="description" content="Faça login na sua conta SmartControl para acessar seus dispositivos IoT." />
      </Helmet>

      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="absolute inset-0 gradient-purple opacity-30"></div>
        <ThemeToggle className="fixed right-4 top-4 z-20" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="gradient-card p-8 rounded-2xl border border-purple-500/30">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Smart<span className="text-purple-400">Control</span>
              </h1>
              <p className="text-gray-400">Entre na sua conta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-2 bg-black/50 border-purple-500/30 text-white"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="relative">
                <Label htmlFor="password" className="text-white">Senha</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-2 bg-black/50 border-purple-500/30 text-white pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-2 top-9 text-xs text-purple-400 hover:text-purple-200"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
                <div className="mt-3 text-right">
                  <button
                    type="button"
                    onClick={openResetRequest}
                    className="text-sm font-medium text-purple-400 hover:text-purple-200"
                  >
                    Recuperar senha
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {loginError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Não tem uma conta?{' '}
                <Link to="/register" className="text-purple-400 hover:text-purple-300">
                  Cadastre-se
                </Link>
              </p>
              <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block">
                Voltar para home
              </Link>
            </div>
          </div>
        </motion.div>

        {resetOpen && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-8 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-recovery-title"
          >
            <button
              type="button"
              aria-label="Fechar recuperação de senha"
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setResetOpen(false)}
            />

            <div className="relative z-10 max-h-[calc(100vh-4rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-purple-500/30 bg-black shadow-2xl shadow-purple-950/40">
              <div className="absolute inset-0 gradient-purple opacity-20" />
              <div className="relative p-6 sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-200">
                      {resetMode === 'update' ? <KeyRound className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      Segurança da conta
                    </div>
                    <h2 id="password-recovery-title" className="text-2xl font-bold text-white">
                      {resetMode === 'update' ? 'Definir nova senha' : 'Recuperar senha'}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {resetMode === 'update'
                        ? 'Digite uma nova senha para concluir a recuperação da sua conta SmartControl.'
                        : 'Informe seu email e enviaremos um link seguro para redefinir sua senha.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setResetOpen(false)}
                    className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-300 transition hover:border-purple-400/60 hover:text-white"
                    aria-label="Fechar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {resetError && (
                  <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {resetError}
                  </div>
                )}

                {resetMode === 'request' ? (
                  resetSent ? (
                    <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-center">
                      <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-400" />
                      <h3 className="font-semibold text-white">Link enviado com segurança</h3>
                      <p className="mt-2 text-sm leading-6 text-gray-300">
                        Se o email estiver cadastrado, você receberá as instruções para criar uma nova senha.
                      </p>
                      <Button
                        type="button"
                        onClick={() => setResetOpen(false)}
                        className="mt-5 bg-purple-600 hover:bg-purple-700"
                      >
                        Entendi
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleResetRequest} className="space-y-5">
                      <div>
                        <Label htmlFor="reset-email" className="text-white">Email cadastrado</Label>
                        <Input
                          id="reset-email"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className="mt-2 bg-black/50 border-purple-500/30 text-white"
                          placeholder="seu@email.com"
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={resetLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {resetLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                      </Button>
                    </form>
                  )
                ) : (
                  <form onSubmit={handlePasswordUpdate} className="space-y-5">
                    <div>
                      <Label htmlFor="new-password" className="text-white">Nova senha</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-2 bg-black/50 border-purple-500/30 text-white"
                        placeholder="Mínimo de 8 caracteres"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="confirm-password" className="text-white">Confirmar nova senha</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-2 bg-black/50 border-purple-500/30 text-white"
                        placeholder="Repita a nova senha"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={updateLoading}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      {updateLoading ? 'Atualizando...' : 'Salvar nova senha'}
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
