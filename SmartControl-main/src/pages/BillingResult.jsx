import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

const BillingResult = () => {
  const location = useLocation();
  const isSuccess = location.pathname.includes('/success');
  const { refresh } = useSubscription();

  useEffect(() => {
    if (!isSuccess) return undefined;

    const timers = [800, 2200, 5000].map((delay) => window.setTimeout(refresh, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isSuccess, refresh]);

  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <>
      <Helmet>
        <title>{isSuccess ? 'Assinatura confirmada' : 'Checkout cancelado'} - SmartControl</title>
        <meta name="description" content="Resultado do checkout SmartControl via Stripe." />
      </Helmet>

      <DashboardLayout>
        <div className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center">
          <div className="theme-card mobile-card w-full rounded-2xl p-6 text-center sm:p-8">
            <Icon className={`mx-auto h-12 w-12 ${isSuccess ? 'text-green-400' : 'text-amber-300'}`} />
            <h1 className="theme-title mt-5 text-2xl font-bold">
              {isSuccess ? 'Assinatura em sincronizacao' : 'Checkout cancelado'}
            </h1>
            <p className="theme-muted mt-3 leading-7">
              {isSuccess
                ? 'O Stripe confirmou o checkout. Assim que o webhook concluir, sua dashboard recebe o plano atualizado automaticamente.'
                : 'Nenhuma cobranca foi concluida. Voce pode escolher outro plano quando quiser.'}
            </p>
            <Link to="/subscription" className="mt-6 inline-block w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Abrir Minha Assinatura</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default BillingResult;
