import { backendUrl } from '@/lib/backend';

export const FREE_PLAN = {
  key: 'free',
  name: 'SmartControl Free',
  profile: 'Primeiros testes',
  description: 'Plano gratuito para validar a automacao com ate 3 dispositivos.',
  unit_amount: 0,
  currency: 'brl',
  recurring: { interval: 'month' },
  device_limit: 3,
  features: ['Ate 3 dispositivos', 'Dashboard em tempo real', 'Controle MQTT basico'],
  permissions: {
    devices: 3,
    advanced_monitoring: false,
    subscription_portal: false,
    mqtt_commands: true,
  },
  is_free: true,
};

export const getBillingReturnUrl = (path = '/subscription') => {
  if (typeof window === 'undefined') return path;

  const basePath = import.meta.env.BASE_URL || '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const normalizedPath = String(path).replace(/^\/+/, '');

  return `${window.location.origin}${normalizedBasePath}${normalizedPath}`;
};

export const formatPlanPrice = (plan) => {
  if (!plan || plan.is_free) return 'Gratis';
  if (typeof plan.unit_amount !== 'number') return 'Preco no Stripe';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: (plan.currency || 'brl').toUpperCase(),
  }).format(plan.unit_amount / 100);
};

export const formatBillingAmount = (amount = 0, currency = 'brl') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: String(currency || 'brl').toUpperCase(),
  }).format((amount || 0) / 100);

export const formatBillingDate = (value) => {
  if (!value) return 'Nao informado';

  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getIntervalLabel = (plan) => {
  const interval = plan?.recurring?.interval;
  if (interval === 'year') return '/ano';
  if (interval === 'week') return '/semana';
  if (interval === 'day') return '/dia';
  return '/mes';
};

export const fetchBillingJson = async (path, { token, method = 'GET', body } = {}) => {
  if (!backendUrl) {
    throw new Error('Backend SmartControl nao configurado.');
  }

  const response = await fetch(`${backendUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Nao foi possivel concluir a operacao de assinatura.');
  }

  return payload;
};

export const buildCheckoutPayload = (priceId) => ({
  price_id: priceId,
  success_url: `${getBillingReturnUrl('/billing/success')}?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: getBillingReturnUrl('/billing/cancel'),
});

export const buildPortalPayload = () => ({
  return_url: getBillingReturnUrl('/subscription'),
});

export const getSafeRedirectPath = (value, fallback = '/dashboard') => {
  if (!value || typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
};
