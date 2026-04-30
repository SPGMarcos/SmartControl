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
              <p className="text-gray-400">Crie sua conta</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-white">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="mt-2 bg-black/50 border-purple-500/30 text-white"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="mt-2 bg-black/50 border-purple-500/30 text-white"
                  placeholder="seu@email.com"
                />
              </div>

              <div className="relative">
                <Label htmlFor="password" className="text-white">Senha</Label>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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
              </div>

              <div className="relative">
                <Label htmlFor="confirmPassword" className="text-white">Confirme a Senha</Label>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="mt-2 bg-black/50 border-purple-500/30 text-white pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-2 top-9 text-xs text-purple-400 hover:text-purple-200"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {formError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {formError}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-purple-400 hover:text-purple-300">
                  Faça login
                </Link>
              </p>
              <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block">
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
