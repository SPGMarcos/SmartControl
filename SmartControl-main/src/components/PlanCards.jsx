import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Gauge,
  Home as HomeIcon,
  Leaf,
  Loader2,
  LockKeyhole,
  Sprout,
  Tractor,
  Warehouse,
} from 'lucide-react';
import { formatPlanPrice, getIntervalLabel } from '@/lib/billing';

const planIcons = {
  free: LockKeyhole,
  residencial_smart: HomeIcon,
  horta_urbana: Leaf,
  produtor_essencial: Sprout,
  agro_profissional: Tractor,
  estufa_inteligente: Warehouse,
  agro_escala: Gauge,
};

const getPlanIcon = (plan) => planIcons[plan?.key] || Gauge;

const PlanSkeleton = ({ index }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className="gradient-card mobile-card min-h-[360px] rounded-2xl border border-purple-500/20 p-5 sm:p-6"
  >
    <div className="h-12 w-12 animate-pulse rounded-2xl bg-white/10" />
    <div className="mt-6 h-5 w-28 animate-pulse rounded bg-white/10" />
    <div className="mt-3 h-8 w-40 animate-pulse rounded bg-white/10" />
    <div className="mt-5 space-y-3">
      <div className="h-3 w-full animate-pulse rounded bg-white/10" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
    </div>
  </motion.div>
);

const PlanCards = ({
  plans = [],
  loading = false,
  error = '',
  onSelect,
  busyPriceId = '',
  currentPriceId = '',
  currentPlanKey = '',
  ctaLabel = 'Assinar plano',
}) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <PlanSkeleton key={index} index={index} />
        ))}
      </div>
    );
  }

  if (error && plans.length === 0) {
    return (
      <div className="gradient-card rounded-2xl border border-red-500/30 p-6 text-center text-gray-300">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
      {plans.map((plan, index) => {
        const Icon = getPlanIcon(plan);
        const isCurrent = (
          (currentPriceId && plan.stripe_price_id === currentPriceId) ||
          (currentPlanKey && plan.key === currentPlanKey)
        );
        const isBusy = busyPriceId && busyPriceId === plan.stripe_price_id;

        return (
          <motion.button
            key={plan.id || plan.stripe_price_id || plan.key}
            type="button"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.06 }}
            viewport={{ once: true }}
            onClick={() => onSelect?.(plan)}
            disabled={isBusy || (!plan.checkout_available && !plan.is_free)}
            className={`gradient-card mobile-card group flex h-full min-h-[380px] flex-col rounded-2xl border p-5 text-left transition-all hover:-translate-y-1 hover:border-purple-300/70 hover:shadow-xl hover:shadow-purple-950/30 focus:outline-none focus:ring-2 focus:ring-purple-300/70 sm:p-6 ${
              isCurrent ? 'border-purple-300/80 shadow-lg shadow-purple-950/30' : 'border-purple-500/20'
            } ${isBusy ? 'cursor-wait opacity-80' : 'cursor-pointer'}`}
          >
            <div className="mb-5 flex flex-col items-start gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
              <span className="rounded-2xl border border-white/10 bg-purple-500/10 p-3 transition group-hover:bg-purple-500/20">
                <Icon className="h-7 w-7 text-purple-300" />
              </span>
              <span className="max-w-full rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300">
                {isCurrent ? 'Plano atual' : plan.profile}
              </span>
            </div>

            <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-3xl font-bold text-purple-200">{formatPlanPrice(plan)}</span>
              {!plan.is_free && <span className="pb-1 text-sm text-gray-400">{getIntervalLabel(plan)}</span>}
            </div>
            <p className="mt-4 flex-1 text-sm leading-6 text-gray-400">{plan.description}</p>

            <div className="mt-6 space-y-3">
              {(plan.features || []).slice(0, 5).map((benefit) => (
                <div key={benefit} className="flex items-start gap-3 text-sm text-gray-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-purple-300" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>

            <span className={`mt-6 inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
              isCurrent
                ? 'border border-purple-400/40 bg-purple-500/10 text-purple-100'
                : 'bg-purple-600 text-white group-hover:bg-purple-500'
            }`}>
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCurrent ? 'Gerenciar assinatura' : ctaLabel}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default PlanCards;
