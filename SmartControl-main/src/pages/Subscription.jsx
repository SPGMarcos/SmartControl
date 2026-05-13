import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { CreditCard, ExternalLink, Gauge, Layers, LockKeyhole, RefreshCw, ShieldCheck, Zap } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import PlanCards from '@/components/PlanCards';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useBillingPlans } from '@/hooks/useBillingPlans';
import { useSubscription } from '@/hooks/useSubscription';
import {
  buildCheckoutPayload,
  buildPortalPayload,
  fetchBillingJson,
  formatBillingAmount,
  formatBillingDate,
  formatPlanPrice,
  getIntervalLabel,
} from '@/lib/billing';

const InfoTile = ({ icon: Icon, label, value, accent = 'text-purple-300' }) => (
  <div className="theme-panel rounded-2xl p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="theme-muted text-sm">{label}</p>
        <p className="theme-title mt-2 break-words text-2xl font-bold">{value}</p>
      </div>
      <Icon className={`h-7 w-7 flex-none ${accent}`} />
    </div>
  </div>
);

const Subscription = () => {
  const { session } = useAuth();
  const { plans, loading: plansLoading, error: plansError, refresh: refreshPlans } = useBillingPlans({ includeFree: true });
  const {
    subscription,
    currentPlan,
    limits,
    permissions,
    invoices,
    loading,
    error,
    refresh,
  } = useSubscription();
  const [busyPriceId, setBusyPriceId] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);

  const availablePlans = useMemo(
    () => plans.filter((plan) => plan.key !== 'free' || currentPlan.key === 'free'),
    [currentPlan.key, plans],
  );

  const handlePlanSelect = async (plan) => {
    if (plan.is_free) {
      toast({
        title: 'Plano gratuito ativo',
        description: 'O plano gratuito fica disponivel automaticamente para novas contas.',
      });
      return;
    }

    setBusyPriceId(plan.stripe_price_id);
    try {
      const payload = await fetchBillingJson('/api/billing/checkout', {
        token: session?.access_token,
        method: 'POST',
        body: buildCheckoutPayload(plan.stripe_price_id),
      });

      window.location.assign(payload.url);
    } catch (requestError) {
      toast({
        variant: 'destructive',
        title: 'Nao foi possivel iniciar assinatura',
        description: requestError.message,
      });
      setBusyPriceId('');
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const payload = await fetchBillingJson('/api/billing/portal', {
        token: session?.access_token,
        method: 'POST',
        body: buildPortalPayload(),
      });
      window.location.assign(payload.url);
    } catch (requestError) {
      toast({
        variant: 'destructive',
        title: 'Portal indisponivel',
        description: requestError.message,
      });
      setPortalLoading(false);
    }
  };

  const refreshAll = () => {
    refresh();
    refreshPlans();
  };

  return (
    <>
      <Helmet>
        <title>Minha Assinatura - SmartControl</title>
        <meta name="description" content="Gerencie plano, assinatura, limites e pagamentos da SmartControl." />
      </Helmet>

      <DashboardLayout>
        <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl min-w-0">
              <p className="theme-kicker text-sm uppercase tracking-[0.25em]">SaaS SmartControl</p>
              <h1 className="theme-title mt-2 text-3xl font-bold md:text-4xl">Minha Assinatura</h1>
              <p className="theme-muted mt-2 leading-7">
                Plano atual, limites de dispositivos, renovacao, historico de pagamentos e upgrades sincronizados com Stripe.
              </p>
            </div>
            <div className="mobile-button-row flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={refreshAll}
                className="border-purple-500/30 bg-black/30 text-gray-300 hover:bg-purple-600/20 hover:text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <Button type="button" onClick={handlePortal} disabled={portalLoading || currentPlan.is_free}>
                <CreditCard className="mr-2 h-4 w-4" />
                {portalLoading ? 'Abrindo...' : 'Gerenciar assinatura'}
              </Button>
            </div>
          </div>

          {(error || plansError) && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              {error || plansError}
            </div>
          )}

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="theme-card mobile-card rounded-2xl p-4 sm:p-6"
          >
            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-purple-500/20 bg-black/25 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className="theme-readable-pill inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                      <ShieldCheck className="h-4 w-4" />
                      {subscription?.status || 'free'}
                    </span>
                    <h2 className="theme-title mt-4 text-3xl font-bold">{currentPlan.name}</h2>
                    <p className="theme-muted mt-2 leading-7">{currentPlan.description}</p>
                  </div>
                  <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-right">
                    <p className="text-sm text-purple-100">Valor</p>
                    <p className="text-2xl font-bold text-white">
                      {formatPlanPrice(currentPlan)}
                      {!currentPlan.is_free && <span className="ml-1 text-sm text-gray-300">{getIntervalLabel(currentPlan)}</span>}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {(currentPlan.features || []).map((feature) => (
                    <div key={feature} className="flex items-start gap-3 rounded-xl bg-black/25 p-3 text-sm text-gray-300">
                      <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-purple-300" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <InfoTile icon={Layers} label="Dispositivos usados" value={`${limits.devices_used}/${limits.device_limit}`} />
                <InfoTile icon={Gauge} label="Disponiveis" value={limits.devices_remaining} accent="text-green-300" />
                <InfoTile icon={CreditCard} label="Proxima renovacao" value={formatBillingDate(subscription?.current_period_end)} accent="text-blue-300" />
                <InfoTile icon={Zap} label="Monitoramento avancado" value={permissions.advanced_monitoring ? 'Liberado' : 'Bloqueado'} accent={permissions.advanced_monitoring ? 'text-green-300' : 'text-amber-300'} />
              </div>
            </div>
          </motion.section>

          {!limits.can_add_device && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-amber-50">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold">Limite de dispositivos atingido</h3>
                  <p className="mt-1 text-sm text-amber-100/80">
                    Seu plano atual permite {limits.device_limit} dispositivos. Faca upgrade para cadastrar novos controladores.
                  </p>
                </div>
                <a href="#planos" className="inline-flex">
                  <Button className="w-full md:w-auto">Ver upgrades</Button>
                </a>
              </div>
            </div>
          )}

          <section id="planos" className="space-y-4">
            <div>
              <h2 className="theme-title text-2xl font-bold">Planos disponiveis</h2>
              <p className="theme-muted mt-1">Os nomes, descricoes e valores abaixo vem diretamente dos produtos e precos ativos no Stripe.</p>
            </div>
            <PlanCards
              plans={availablePlans}
              loading={plansLoading || loading}
              error={plansError}
              onSelect={handlePlanSelect}
              busyPriceId={busyPriceId}
              currentPriceId={subscription?.stripe_price_id}
              currentPlanKey={currentPlan.key}
              ctaLabel="Assinar ou trocar"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
            <div className="theme-card mobile-card rounded-2xl p-4 sm:p-6">
              <h2 className="theme-title text-xl font-bold">Historico de pagamentos</h2>
              <div className="mt-5 space-y-3">
                {invoices.length > 0 ? invoices.map((invoice) => (
                  <div key={invoice.id || invoice.stripe_invoice_id} className="theme-panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="theme-title font-medium">{formatBillingAmount(invoice.amount_paid || invoice.amount_due, invoice.currency)}</p>
                      <p className="theme-muted text-sm">{formatBillingDate(invoice.created_at)} - {invoice.status}</p>
                    </div>
                    {invoice.hosted_invoice_url && (
                      <a href={invoice.hosted_invoice_url} target="_blank" rel="noreferrer" className="theme-link inline-flex items-center text-sm font-semibold">
                        Abrir recibo
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    )}
                  </div>
                )) : (
                  <div className="theme-panel rounded-xl p-4 text-sm text-[var(--text-secondary)]">
                    Nenhum pagamento sincronizado ainda.
                  </div>
                )}
              </div>
            </div>

            <div className="theme-card mobile-card rounded-2xl p-4 sm:p-6">
              <h2 className="theme-title text-xl font-bold">Permissoes do plano</h2>
              <div className="mt-5 space-y-3">
                {[
                  ['Comandos MQTT', permissions.mqtt_commands],
                  ['Historico de dispositivos', permissions.device_history],
                  ['Monitoramento avancado', permissions.advanced_monitoring],
                  ['Portal de assinatura', permissions.subscription_portal],
                ].map(([label, enabled]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-black/25 p-3">
                    <span className="text-sm text-gray-300">{label}</span>
                    <span className={`rounded-full px-3 py-1 text-xs ${enabled ? 'bg-green-500/15 text-green-200' : 'bg-amber-500/15 text-amber-200'}`}>
                      {enabled ? 'Liberado' : 'Bloqueado'}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 rounded-xl bg-black/25 p-3">
                  <span className="flex items-center gap-2 text-sm text-gray-300">
                    <LockKeyhole className="h-4 w-4 text-purple-300" />
                    Usuarios de equipe
                  </span>
                  <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs text-purple-100">
                    {permissions.team_users || 1}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </DashboardLayout>
    </>
  );
};

export default Subscription;
