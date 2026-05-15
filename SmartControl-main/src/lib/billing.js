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

const isBillingDebugEnabled = () => {
  if (import.meta.env.VITE_BILLING_DEBUG === 'true') return true;
  if (typeof window === 'undefined') return false;
  return window.localStorage?.getItem('smartcontrol:billing-debug') === 'true';
};

const billingDebug = (event, payload = {}) => {
  if (!isBillingDebugEnabled()) return;
  console.debug(`[billing] ${event}`, payload);
};

const normalizeIdentity = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const getBillingPlanIdentity = (plan = {}) => {
  const priceId = plan.stripe_price_id || plan.price_id || '';
  const productId = plan.stripe_product_id || plan.product_id || '';
  const subscriptionId = plan.stripe_subscription_id || plan.subscription_id || '';

  return {
    priceId,
    productId,
    subscriptionId,
    logicalKey: normalizeIdentity(plan.key || plan.plan_key || plan.lookup_key || plan.name || plan.id),
    renderKey: priceId || productId || subscriptionId || plan.id || plan.key || normalizeIdentity(plan.name),
  };
};

const getPlanDedupeKeys = (plan = {}) => {
  const identity = getBillingPlanIdentity(plan);
  return [
    identity.priceId && `price:${identity.priceId}`,
    identity.productId && `product:${identity.productId}`,
    identity.subscriptionId && `subscription:${identity.subscriptionId}`,
    identity.logicalKey && `plan:${identity.logicalKey}`,
  ].filter(Boolean);
};

const shouldReplacePlan = (current = {}, candidate = {}) => {
  if (!current) return true;
  if (!current.stripe_price_id && candidate.stripe_price_id) return true;
  if (!current.stripe_product_id && candidate.stripe_product_id) return true;
  if (typeof current.unit_amount !== 'number' && typeof candidate.unit_amount === 'number') return true;
  return false;
};

export const dedupeBillingPlans = (plans = [], { includeFree = false, source = 'unknown' } = {}) => {
  const byPrimaryKey = new Map();
  const aliases = new Map();
  const duplicates = [];

  plans.filter(Boolean).forEach((plan) => {
    if (plan.is_free || plan.key === 'free') {
      if (includeFree && !byPrimaryKey.has('plan:free')) {
        byPrimaryKey.set('plan:free', FREE_PLAN);
        aliases.set('plan:free', 'plan:free');
      }
      return;
    }

    const keys = getPlanDedupeKeys(plan);
    if (keys.length === 0) return;

    const primaryKey = keys.map((key) => aliases.get(key)).find(Boolean) || keys[0];
    const existing = byPrimaryKey.get(primaryKey);

    if (!existing || shouldReplacePlan(existing, plan)) {
      byPrimaryKey.set(primaryKey, plan);
      keys.forEach((key) => aliases.set(key, primaryKey));
      return;
    }

    duplicates.push({
      dropped: getBillingPlanIdentity(plan),
      kept: getBillingPlanIdentity(existing),
      source,
    });
    keys.forEach((key) => aliases.set(key, primaryKey));
  });

  if (duplicates.length > 0) {
    billingDebug('dedupe:plans', { source, duplicates });
  }

  return Array.from(byPrimaryKey.values());
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

export const fetchBillingJson = async (path, { token, method = 'GET', body, signal } = {}) => {
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
    signal,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || 'Nao foi possivel concluir a operacao de assinatura.');
    error.code = payload.code || 'billing_request_failed';
    error.status = response.status;
    throw error;
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
