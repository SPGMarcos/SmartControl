import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ThemeToggle from '@/components/ThemeToggle';
import { UserPlus } from 'lucide-react';
import { normalizeEmail, sanitizeText, validateDisplayName, validateEmail, validatePassword } from '@/lib/security';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const safeName = sanitizeText(name, 80);
    const normalizedEmail = normalizeEmail(email);
    const nameError = validateDisplayName(safeName);
    const emailError = validateEmail(normalizedEmail);
    const passwordError = validatePassword(password);

    if (nameError || emailError || passwordError) {
      setFormError(nameError || emailError || passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setFormError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const { error } = await signUp(normalizedEmail, password, {
      data: {
        full_name: safeName,
        role: 'user',
      },
    });
    setLoading(false);

    if (!error) {
      navigate('/login');
    }
  };

  return (
    <>
      <Helmet>
        <title>Cadastro - SmartControl</title>
        <meta name="description" content="Crie sua conta SmartControl e comece a automatizar seus dispositivos IoT." />
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
              <p className="auth-muted">Crie sua conta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name" className="auth-label">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="mt-2"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <Label htmlFor="email" className="auth-label">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="mt-2"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="relative">
                <Label htmlFor="password" className="auth-label">Senha</Label>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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
              </div>

              <div className="relative">
                <Label htmlFor="confirmPassword" className="auth-label">Confirme a Senha</Label>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="mt-2 pr-20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="auth-inline-button absolute right-2 top-9 rounded-md px-2 py-1 text-xs font-medium"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {formError && (
                <div className="auth-alert-danger rounded-xl px-4 py-3 text-sm">
                  {formError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="auth-muted">
                Já tem uma conta?{' '}
                <Link to="/login" className="auth-link font-medium">
                  Faça login
                </Link>
              </p>
              <Link to="/" className="auth-link text-sm mt-2 inline-block font-medium">
                Voltar para home
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Register;
