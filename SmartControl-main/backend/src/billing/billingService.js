import Stripe from 'stripe';
import {
  FREE_PLAN,
  buildPlanPermissions,
  getConfiguredPlanPriceIds,
  getPlanConfigByPriceId,
  normalizePlanFromStripePrice,
  normalizePlanFromSubscriptionRow,
  normalizePlanKey,
  toPositiveInteger,
} from './planCatalog.js';

const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due'];
const PLAN_CACHE_TTL_MS = 5 * 60 * 1000;

let planCache = {
  expiresAt: 0,
  plans: null,
};

export const createStripeClient = (env = process.env) => {
  if (!env.STRIPE_SECRET_KEY) return null;

  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: env.STRIPE_API_VERSION || undefined,
  });
};

const getStripeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.id || null;
};

const toIsoFromStripeTimestamp = (value) => {
  if (!value) return null;
  return new Date(Number(value) * 1000).toISOString();
};

const sanitizeReturnUrl = (url, { req, env = process.env } = {}) => {
  const fallbackBase =
    env.APP_PUBLIC_URL ||
    env.FRONTEND_URL ||
    env.VITE_PUBLIC_APP_URL ||
    env.VITE_FRONTEND_URL ||
    (env.CORS_ORIGIN || '').split(',').map((item) => item.trim()).find(Boolean) ||
    `${req?.protocol || 'http'}://${req?.get?.('host') || 'localhost:5173'}`;

  const fallback = `${String(fallbackBase).replace(/\/+$/, '')}/subscription`;

  if (!url) return fallback;

  try {
    const parsed = new URL(url);
    const allowedOrigins = new Set(
      (env.CORS_ORIGIN || '')
        .split(',')
        .map((item) => item.trim().replace(/\/+$/, ''))
        .filter(Boolean),
    );
    if (env.APP_PUBLIC_URL) allowedOrigins.add(new URL(env.APP_PUBLIC_URL).origin);
    if (env.FRONTEND_URL) allowedOrigins.add(new URL(env.FRONTEND_URL).origin);
    if (env.VITE_PUBLIC_APP_URL) allowedOrigins.add(new URL(env.VITE_PUBLIC_APP_URL).origin);
    if (env.VITE_FRONTEND_URL) allowedOrigins.add(new URL(env.VITE_FRONTEND_URL).origin);

    const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
    const isAllowed = allowedOrigins.has('*') || allowedOrigins.has(parsed.origin) || isLocalhost;

    return isAllowed ? url : fallback;
  } catch {
    return fallback;
  }
};

export const listBillingPlans = async ({ stripe, env = process.env, includeFree = false, forceRefresh = false } = {}) => {
  if (!stripe) {
    return includeFree ? [FREE_PLAN] : [];
  }

  if (!forceRefresh && planCache.plans && planCache.expiresAt > Date.now()) {
    return includeFree ? [FREE_PLAN, ...planCache.plans] : planCache.plans;
  }

  const configuredPlans = getConfiguredPlanPriceIds(env);
  const prices = [];

  if (configuredPlans.length > 0) {
    for (const config of configuredPlans) {
      try {
        const price = await stripe.prices.retrieve(config.priceId, {
          expand: ['product'],
        });
        if (price?.active !== false && price?.recurring?.interval === 'month') {
          prices.push({ price, config });
        } else {
          console.warn(`Stripe price ${config.priceId} ignorado: assinatura mensal ativa e obrigatoria.`);
        }
      } catch (error) {
        console.warn(`Stripe price ${config.priceId} nao pode ser carregado:`, error.message);
      }
    }
  } else {
    const response = await stripe.prices.list({
      active: true,
      type: 'recurring',
      limit: 100,
      expand: ['data.product'],
    });
    const monthlyPrices = response.data.filter((price) => price.recurring?.interval === 'month');
    const smartControlPrices = monthlyPrices.filter((price) => {
      const product = typeof price.product === 'object' ? price.product : {};
      const metadata = { ...(product.metadata || {}), ...(price.metadata || {}) };
      const productName = String(product.name || '').toLowerCase();

      return (
        metadata.smartcontrol === 'true' ||
        metadata.app === 'smartcontrol' ||
        metadata.platform === 'smartcontrol' ||
        productName.includes('smartcontrol')
      );
    });

    (smartControlPrices.length > 0 ? smartControlPrices : monthlyPrices)
      .forEach((price) => prices.push({ price, config: getPlanConfigByPriceId(price.id, env) }));
  }

  const uniquePlans = new Map();
  prices.forEach(({ price, config }) => {
    const plan = normalizePlanFromStripePrice({ price, env, config });
    if (plan.active) uniquePlans.set(plan.stripe_price_id, plan);
  });

  const plans = Array.from(uniquePlans.values()).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  planCache = {
    expiresAt: Date.now() + PLAN_CACHE_TTL_MS,
    plans,
  };

  return includeFree ? [FREE_PLAN, ...plans] : plans;
};

export const findUserIdByStripeCustomer = async ({ supabase, customerId }) => {
  if (!customerId) return null;

  const { data: customerRow } = await supabase
    .from('billing_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (customerRow?.user_id) return customerRow.user_id;

  const { data: subscriptionRow } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return subscriptionRow?.user_id || null;
};

export const getOrCreateStripeCustomer = async ({ stripe, supabase, user }) => {
  const { data: existing } = await supabase
    .from('billing_customers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email || undefined,
    name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
    metadata: {
      user_id: user.id,
      platform: 'smartcontrol',
    },
  });

  await supabase.from('billing_customers').upsert({
    user_id: user.id,
    stripe_customer_id: customer.id,
    email: user.email || null,
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id',
  });

  return customer.id;
};

export const getActiveSubscriptionRow = async ({ supabase, userId }) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ACTIVE_SUBSCRIPTION_STATUSES)
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Nao foi possivel consultar assinatura ativa:', error.message);
    return null;
  }

  return data || null;
};

export const getDeviceUsage = async ({ supabase, userId }) => {
  const { count, error } = await supabase
    .from('devices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.warn('Nao foi possivel contar dispositivos:', error.message);
    return 0;
  }

  return count || 0;
};

export const getBillingOverview = async ({ supabase, stripe, env = process.env, userId }) => {
  const [subscription, devicesUsed, plansResult, invoicesResult] = await Promise.all([
    getActiveSubscriptionRow({ supabase, userId }),
    getDeviceUsage({ supabase, userId }),
    listBillingPlans({ stripe, env, includeFree: true }).catch((error) => {
      console.warn('Nao foi possivel listar planos Stripe:', error.message);
      return [FREE_PLAN];
    }),
    supabase
      .from('subscription_invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  let currentPlan = subscription ? normalizePlanFromSubscriptionRow(subscription) : FREE_PLAN;
  const stripePlan = plansResult.find((plan) => (
    (subscription?.stripe_price_id && plan.stripe_price_id === subscription.stripe_price_id) ||
    (subscription?.plan_key && plan.key === normalizePlanKey(subscription.plan_key))
  ));
  if (stripePlan) currentPlan = stripePlan;

  const deviceLimit = toPositiveInteger(currentPlan.device_limit, FREE_PLAN.device_limit);
  const remaining = Math.max(deviceLimit - devicesUsed, 0);
  const permissions = buildPlanPermissions(currentPlan);

  return {
    subscription,
    current_plan: currentPlan,
    limits: {
      device_limit: deviceLimit,
      devices_used: devicesUsed,
      devices_remaining: remaining,
      can_add_device: devicesUsed < deviceLimit,
    },
    permissions,
    invoices: invoicesResult.data || [],
    plans: plansResult,
  };
};

export const assertCanCreateDevice = async ({ supabase, stripe, env = process.env, userId }) => {
  const overview = await getBillingOverview({ supabase, stripe, env, userId });

  if (!overview.limits.can_add_device) {
    const error = new Error(`Limite de ${overview.limits.device_limit} dispositivos do plano atual atingido.`);
    error.statusCode = 402;
    error.code = 'device_limit_reached';
    error.billing = overview;
    throw error;
  }

  return overview;
};

export const createCheckoutSession = async ({ stripe, supabase, env = process.env, req, user, body = {} }) => {
  if (!stripe) {
    const error = new Error('Stripe nao configurado no backend.');
    error.statusCode = 503;
    throw error;
  }

  const priceId = String(body.price_id || body.priceId || '').trim();
  if (!priceId) {
    const error = new Error('price_id e obrigatorio para iniciar checkout.');
    error.statusCode = 400;
    throw error;
  }

  const plans = await listBillingPlans({ stripe, env, includeFree: false, forceRefresh: true });
  const selectedPlan = plans.find((plan) => plan.stripe_price_id === priceId);

  if (!selectedPlan) {
    const error = new Error('Plano nao encontrado no Stripe ou nao esta ativo.');
    error.statusCode = 404;
    throw error;
  }

  const customerId = await getOrCreateStripeCustomer({ stripe, supabase, user });
  const activeSubscription = await getActiveSubscriptionRow({ supabase, userId: user.id });
  const successUrl = sanitizeReturnUrl(body.success_url || body.successUrl, { req, env });
  const cancelUrl = sanitizeReturnUrl(body.cancel_url || body.cancelUrl, { req, env });

  if (activeSubscription?.stripe_subscription_id) {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: cancelUrl,
    });

    return {
      mode: 'portal',
      reason: activeSubscription.stripe_price_id === priceId ? 'same_plan' : 'existing_subscription',
      url: portalSession.url,
      selected_plan: selectedPlan,
    };
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: user.id,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: user.id,
      price_id: priceId,
      plan_key: selectedPlan.key,
      platform: 'smartcontrol',
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        price_id: priceId,
        plan_key: selectedPlan.key,
        platform: 'smartcontrol',
      },
    },
  });

  return {
    mode: 'checkout',
    url: checkoutSession.url,
    session_id: checkoutSession.id,
    selected_plan: selectedPlan,
  };
};

export const createBillingPortalSession = async ({ stripe, supabase, env = process.env, req, user, body = {} }) => {
  if (!stripe) {
    const error = new Error('Stripe nao configurado no backend.');
    error.statusCode = 503;
    throw error;
  }

  const customerId = await getOrCreateStripeCustomer({ stripe, supabase, user });
  const returnUrl = sanitizeReturnUrl(body.return_url || body.returnUrl, { req, env });
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return {
    url: portalSession.url,
  };
};

export const upsertSubscriptionFromStripe = async ({ stripe, supabase, env = process.env, subscription }) => {
  const hasExpandedPrice = subscription?.items?.data?.[0]?.price && typeof subscription.items.data[0].price.product === 'object';
  const expandedSubscription = hasExpandedPrice
    ? subscription
    : await stripe.subscriptions.retrieve(subscription.id, {
        expand: ['items.data.price.product'],
      });

  const customerId = getStripeId(expandedSubscription.customer);
  const item = expandedSubscription.items?.data?.[0] || null;
  const price = item?.price || null;
  const periodStart = expandedSubscription.current_period_start || item?.current_period_start;
  const periodEnd = expandedSubscription.current_period_end || item?.current_period_end;
  const plan = price
    ? normalizePlanFromStripePrice({ price, env, config: getPlanConfigByPriceId(price.id, env) })
    : normalizePlanFromSubscriptionRow(null);
  const productId = price ? getStripeId(price.product) : null;
  const userId =
    expandedSubscription.metadata?.user_id ||
    await findUserIdByStripeCustomer({ supabase, customerId });

  if (!userId) {
    console.warn(`Assinatura ${expandedSubscription.id} recebida sem usuario SmartControl associado.`);
    return null;
  }

  const row = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: expandedSubscription.id,
    stripe_price_id: price?.id || expandedSubscription.metadata?.price_id || null,
    stripe_product_id: productId,
    plan_key: plan.key,
    plan_name: plan.name,
    status: expandedSubscription.status,
    cancel_at_period_end: Boolean(expandedSubscription.cancel_at_period_end),
    current_period_start: toIsoFromStripeTimestamp(periodStart),
    current_period_end: toIsoFromStripeTimestamp(periodEnd),
    trial_start: toIsoFromStripeTimestamp(expandedSubscription.trial_start),
    trial_end: toIsoFromStripeTimestamp(expandedSubscription.trial_end),
    metadata: {
      stripe_status: expandedSubscription.status,
      price_metadata: price?.metadata || {},
      product_metadata: typeof price?.product === 'object' ? price.product.metadata || {} : {},
      device_limit: plan.device_limit,
      plan,
    },
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('subscriptions')
    .upsert(row, {
      onConflict: 'stripe_subscription_id',
    });

  if (error) throw error;

  await supabase.from('billing_customers').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id',
  });

  return row;
};

export const upsertInvoiceFromStripe = async ({ stripe, supabase, invoice }) => {
  const customerId = getStripeId(invoice.customer);
  const subscriptionId =
    getStripeId(invoice.subscription) ||
    getStripeId(invoice.parent?.subscription_details?.subscription) ||
    getStripeId(invoice.lines?.data?.[0]?.subscription);
  let userId = await findUserIdByStripeCustomer({ supabase, customerId });

  if (!userId && subscriptionId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();
    userId = data?.user_id || null;
  }

  if (!userId && subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      userId = subscription.metadata?.user_id || null;
    } catch {
      userId = null;
    }
  }

  if (!userId) {
    console.warn(`Invoice ${invoice.id} recebida sem usuario SmartControl associado.`);
    return null;
  }

  const row = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: subscriptionId,
    amount_due: invoice.amount_due ?? 0,
    amount_paid: invoice.amount_paid ?? 0,
    currency: invoice.currency || 'brl',
    status: invoice.status || 'unknown',
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    invoice_pdf: invoice.invoice_pdf || null,
    paid_at: toIsoFromStripeTimestamp(invoice.status_transitions?.paid_at),
    period_start: toIsoFromStripeTimestamp(invoice.period_start),
    period_end: toIsoFromStripeTimestamp(invoice.period_end),
    metadata: invoice.metadata || {},
    created_at: toIsoFromStripeTimestamp(invoice.created) || new Date().toISOString(),
  };

  const { error } = await supabase
    .from('subscription_invoices')
    .upsert(row, {
      onConflict: 'stripe_invoice_id',
    });

  if (error) throw error;
  return row;
};

export const handleStripeEvent = async ({ stripe, supabase, env = process.env, event }) => {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (session.mode === 'subscription' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(getStripeId(session.subscription), {
          expand: ['items.data.price.product'],
        });
        if (session.client_reference_id && !subscription.metadata?.user_id) {
          subscription.metadata = {
            ...(subscription.metadata || {}),
            user_id: session.client_reference_id,
            price_id: session.metadata?.price_id,
            plan_key: session.metadata?.plan_key,
          };
        }
        return upsertSubscriptionFromStripe({ stripe, supabase, env, subscription });
      }
      return null;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return upsertSubscriptionFromStripe({
        stripe,
        supabase,
        env,
        subscription: event.data.object,
      });

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
    case 'invoice.paid':
    case 'invoice.finalized':
      return upsertInvoiceFromStripe({
        stripe,
        supabase,
        invoice: event.data.object,
      });

    default:
      return null;
  }
};
