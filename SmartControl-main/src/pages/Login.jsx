import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (!error) {
      navigate('/dashboard');
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
              </div>

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
      </div>
    </>
  );
};

export default Login;