import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { getAuthParams } from '@/lib/authRedirect';

const AuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Validando seu link de confirmação...');

  useEffect(() => {
    let mounted = true;

    const finish = (nextStatus, nextMessage) => {
      if (!mounted) return;
      setStatus(nextStatus);
      setMessage(nextMessage);
    };

    const handleCallback = async () => {
      const params = getAuthParams({ search: location.search, hash: location.hash });

      if (params.error) {
        finish('error', params.errorDescription || 'O link de autenticação é inválido ou expirou.');
        return;
      }

      try {
        let result = null;

        if (params.code) {
          result = await supabase.auth.exchangeCodeForSession(params.code);
        } else if (params.accessToken && params.refreshToken) {
          result = await supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          });
        } else {
          const { data } = await supabase.auth.getSession();
          result = { data, error: null };
        }

        if (result?.error) throw result.error;

        const authType = params.type || '';
        if (authType === 'recovery') {
          navigate(`/login?reset_password=true${location.hash || ''}`, { replace: true });
          return;
        }

        finish(
          'success',
          'Conta confirmada com sucesso. Sua conta SmartControl já está ativa.',
        );
      } catch {
        finish('error', 'Não foi possível validar este link. Solicite um novo e-mail e tente novamente.');
      }
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [location.hash, location.search, navigate]);

  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <>
      <Helmet>
        <title>Confirmação de conta - SmartControl</title>
        <meta name="description" content="Confirmação segura de conta SmartControl." />
      </Helmet>

      <div className="auth-shell mobile-wrap flex min-h-screen items-center justify-center px-3 py-8 sm:px-4">
        <ThemeToggle className="fixed right-4 top-4 z-20" />
        <div className="auth-card mobile-card w-full max-w-md rounded-2xl p-6 text-center sm:p-8">
          {status === 'loading' && <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-300" />}
          {isSuccess && <CheckCircle2 className="mx-auto h-12 w-12 text-green-300" />}
          {isError && <XCircle className="mx-auto h-12 w-12 text-red-300" />}

          <h1 className="auth-brand-title mt-5 text-2xl font-bold">
            {status === 'loading' ? 'Confirmando conta' : isSuccess ? 'Conta confirmada' : 'Link inválido'}
          </h1>
          <p className="auth-muted mt-3 leading-7">{message}</p>

          {status !== 'loading' && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link to="/login" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto">Ir para login</Button>
              </Link>
              <Link to="/register" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto">Criar nova conta</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AuthCallback;
