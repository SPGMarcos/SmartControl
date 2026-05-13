import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { buildCheckoutPayload, fetchBillingJson } from '@/lib/billing';

const BillingCheckout = () => {
  const { session } = useAuth();
  const location = useLocation();
  const startedRef = useRef(false);
  const [error, setError] = useState('');
  const priceId = new URLSearchParams(location.search).get('price_id');

  useEffect(() => {
    if (!session?.access_token || startedRef.current) return;
    startedRef.current = true;

    const startCheckout = async () => {
      if (!priceId) {
        setError('Plano nao informado para checkout.');
        return;
      }

      try {
        const payload = await fetchBillingJson('/api/billing/checkout', {
          token: session.access_token,
          method: 'POST',
          body: buildCheckoutPayload(priceId),
        });

        if (payload.url) {
          window.location.assign(payload.url);
          return;
        }

        setError('O Stripe nao retornou uma URL de checkout.');
      } catch (requestError) {
        setError(requestError.message || 'Nao foi possivel iniciar checkout.');
      }
    };

    startCheckout();
  }, [priceId, session?.access_token]);

  return (
    <>
      <Helmet>
        <title>Checkout - SmartControl</title>
        <meta name="description" content="Checkout seguro da assinatura SmartControl via Stripe." />
      </Helmet>

      <DashboardLayout>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
          <div className="theme-card mobile-card w-full rounded-2xl p-6 text-center sm:p-8">
            {error ? (
              <>
                <h1 className="theme-title text-2xl font-bold">Nao foi possivel abrir o checkout</h1>
                <p className="theme-muted mt-3 leading-7">{error}</p>
                <Link to="/subscription" className="mt-6 inline-block w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">Voltar para Minha Assinatura</Button>
                </Link>
              </>
            ) : (
              <>
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-purple-300" />
                <h1 className="theme-title mt-5 text-2xl font-bold">Abrindo checkout seguro</h1>
                <p className="theme-muted mt-3 leading-7">
                  Estamos redirecionando voce para o Stripe para concluir a assinatura.
                </p>
              </>
            )}
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default BillingCheckout;
