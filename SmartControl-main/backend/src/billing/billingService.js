import Stripe from 'stripe';
import {
  FREE_PLAN,
  STRIPE_PLAN_CONFIGS,
  buildPlanPermissions,
  getConfiguredPlanPriceIds,
  getPlanConfigByPriceId,
  getPlanConfigByStripeMetadata,
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

const isBillingDebugEnabled = (env = process.env) =>
  String(env.BILLING_DEBUG || env.STRIPE_BILLING_DEBUG || '').toLowerCase() === 'true';

const logBillingDebug = (env, event, payload = {}) => {
  if (!isBillingDebugEnabled(env)) return;
  console.info(`[billing] ${event}`, payload);
};

const toIsoFromStripeTimestamp = (value) => {
  if (!value) return null;
  return new Date(Number(value) * 1000).toISOString();
};

const shouldRetryWithoutNewColumns = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return message.includes('column') || message.includes('schema') || message.includes('cache');
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

const discoverStripePlans = async ({ stripe, env = process.env } = {}) => {
  const response = await stripe.prices.list({
    active: true,
    type: 'recurring',
    limit: 100,
    expand: ['data.product'],
  });
  const recurringPrices = response.data.filter((price) => Boolean(price.recurring));
  const smartControlPrices = recurringPrices.filter((price) => {
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

  return (smartControlPrices.length > 0 ? smartControlPrices : recurringPrices)
    .map((price) => ({ price, config: getPlanConfigByPriceId(price.id, env) }));
};

const planNames = {
  residencial_smart: 'SmartControl Residencial Smart',
  horta_urbana: 'SmartControl Horta Urbana',
  produtor_essencial: 'SmartControl Produtor Essencial',
  agro_profissional: 'SmartControl Agro Profissional',
  estufa_inteligente: 'SmartControl Estufa Inteligente',
  agro_escala: 'SmartControl Agro Escala',
};

const planDescriptions = {
  residencial_smart: 'Automacao residencial com painel web, MQTT e monitoramento essencial.',
  horta_urbana: 'Irrigacao e sensores para hortas urbanas e pequenos cultivos.',
  produtor_essencial: 'Automacao remota para pequenos produtores com ate 25 dispositivos.',
  agro_profissional: 'Controle agricola profissional para bombas, setores e monitoramento remoto.',
  estufa_inteligente: 'Monitoramento e controle de estufas automatizadas.',
  agro_escala: 'Plano escalavel para multiplas unidades e grandes produtores.',
};

const buildConfiguredPlanFallback = (config, priceId = '') => {
  const plan = {
    id: priceId || config.key,
    key: config.key,
    name: planNames[config.key] || `SmartControl ${config.key}`,
    profile: config.profile,
    description: planDescriptions[config.key] || 'Plano SmartControl configurado para venda.',
    stripe_price_id: priceId || null,
    stripe_product_id: null,
    unit_amount: null,
    currency: 'brl',
    recurring: { interval: 'month', interval_count: 1 },
    device_limit: config.deviceLimit,
    features: config.features,
    metadata: {
      plan_key: config.key,
      source: 'configured_catalog_fallback',
    },
    sort: config.sort,
    active: true,
    is_free: false,
    checkout_available: Boolean(priceId),
  };

  return {
    ...plan,
    permissions: buildPlanPermissions(plan),
  };
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
        if (price?.active !== false && price?.recurring) {
          prices.push({ price, config });
        } else {
          console.warn(`Stripe price ${config.priceId} ignorado: preco recorrente ativo e obrigatorio.`);
        }
      } catch (error) {
        console.warn(`Stripe price ${config.priceId} nao pode ser carregado:`, error.message);
      }
    }
  }

  if (configuredPlans.length === 0 || prices.length < configuredPlans.length) {
    const discoveredPrices = await discoverStripePlans({ stripe, env });
    const knownPriceIds = new Set(prices.map(({ price }) => price.id));
    discoveredPrices.forEach((entry) => {
      if (!knownPriceIds.has(entry.price.id)) {
        prices.push(entry);
        knownPriceIds.add(entry.price.id);
      }
    });
  }

  const uniquePlans = new Map();
  const duplicatePlans = [];
  prices.forEach(({ price, config }) => {
    const plan = normalizePlanFromStripePrice({ price, env, config });
    if (!plan.active) return;

    const product = typeof price.product === 'object' && price.product ? price.product : {};
    const planConfig = config || getPlanConfigByStripeMetadata({
      metadata: {
        ...(product.metadata || {}),
        ...(price.metadata || {}),
      },
      productName: product.name,
      lookupKey: price.lookup_key,
    });
    const dedupeKey = planConfig?.key || plan.key || plan.stripe_price_id;
    const existingPlan = uniquePlans.get(dedupeKey);
    const shouldReplace =
      !existingPlan ||
      (config && existingPlan.stripe_price_id !== config.priceId) ||
      (typeof plan.unit_amount === 'number' && typeof existingPlan.unit_amount !== 'number');

    if (shouldReplace) {
      if (existingPlan) {
        duplicatePlans.push({
          key: dedupeKey,
          kept: plan.stripe_price_id,
          dropped: existingPlan.stripe_price_id,
          reason: 'replaced_by_configured_or_complete_plan',
        });
      }
      uniquePlans.set(dedupeKey, plan);
      return;
    }

    duplicatePlans.push({
      key: dedupeKey,
      kept: existingPlan.stripe_price_id,
      dropped: plan.stripe_price_id,
      reason: 'duplicate_plan_identity',
    });
  });
  configuredPlans.forEach((config) => {
    if (!uniquePlans.has(config.key)) {
      uniquePlans.set(config.key, buildConfiguredPlanFallback(config, config.priceId));
    }
  });

  if (uniquePlans.size === 0) {
    STRIPE_PLAN_CONFIGS.forEach((config) => {
      uniquePlans.set(config.key, buildConfiguredPlanFallback(config));
    });
  }

  const plans = Array.from(uniquePlans.values()).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  logBillingDebug(env, 'plans:list', {
    configured: configuredPlans.map((config) => ({ key: config.key, price_id: config.priceId })),
    discovered_count: prices.length,
    returned_count: plans.length,
    duplicates: duplicatePlans,
  });

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

export const findUserIdByEmail = async ({ supabase, email }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) return null;

  const { data: customerRow } = await supabase
    .from('billing_customers')
    .select('user_id')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (customerRow?.user_id) return customerRow.user_id;

  const { data: subscriptionRow } = await supabase
    .from('subscriptions')
    .select('user_id')
    .ilike('email', normalizedEmail)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscriptionRow?.user_id) return subscriptionRow.user_id;

  try {
    let page = 1;
    const perPage = 1000;

    while (page <= 10) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      const user = (data?.users || []).find((item) => String(item.email || '').toLowerCase() === normalizedEmail);
      if (user?.id) return user.id;
      if ((data?.users || []).length < perPage) break;
      page += 1;
    }
  } catch (error) {
    console.warn('Nao foi possivel localizar usuario por email no Supabase Auth:', error.message);
  }

  return null;
};

export const getOrCreateStripeCustomer = async ({ stripe, supabase, user }) => {
  const { data: existing } = await supabase
    .from('billing_customers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.retrieve(existing.stripe_customer_id);
      if (!customer?.deleted) return existing.stripe_customer_id;
    } catch (error) {
      if (error?.type !== 'StripeInvalidRequestError') throw error;
      console.warn(`Customer Stripe ${existing.stripe_customer_id} nao existe mais. Um novo customer sera criado.`);
    }

    await supabase
      .from('billing_customers')
      .delete()
      .eq('user_id', user.id);
  }

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

const upsertBillingCustomerReference = async ({ supabase, user, customerId }) => {
  if (!customerId || !user?.id) return;

  await supabase.from('billing_customers').upsert({
    user_id: user.id,
    stripe_customer_id: customerId,
    email: user.email || null,
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id',
  });
};

const getStripeCustomerForBilling = async ({ stripe, supabase, user, activeSubscription = null }) => {
  const subscriptionCustomerId = activeSubscription?.stripe_customer_id || null;

  if (subscriptionCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(subscriptionCustomerId);
      if (!customer?.deleted) {
        await upsertBillingCustomerReference({ supabase, user, customerId: subscriptionCustomerId });
        return subscriptionCustomerId;
      }
    } catch (error) {
      if (error?.type !== 'StripeInvalidRequestError') throw error;
      console.warn(`Customer Stripe ${subscriptionCustomerId} da assinatura ativa nao existe mais.`);
    }
  }

  return getOrCreateStripeCustomer({ stripe, supabase, user });
};

const createPortalSession = async ({ stripe, env = process.env, customerId, returnUrl, flowData = null }) => {
  const params = {
    customer: customerId,
    return_url: returnUrl,
  };

  if (flowData) {
    params.flow_data = flowData;
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create(params);

    if (!portalSession?.url) {
      const error = new Error('Stripe nao retornou uma URL valida para o portal de assinatura.');
      error.statusCode = 502;
      error.code = 'billing_portal_url_missing';
      throw error;
    }

    return portalSession;
  } catch (error) {
    const message = `${error?.message || ''}`.toLowerCase();
    if (message.includes('configuration') || message.includes('billing portal')) {
      error.statusCode = 409;
      error.code = 'billing_portal_not_configured';
      error.message = 'Portal de cobranca do Stripe nao configurado. Ative o Customer Portal no painel Stripe para permitir troca de plano, cancelamento e cartao.';
    } else if (message.includes('features.subscription_update.products') || message.includes('price must also be included')) {
      error.statusCode = 409;
      error.code = 'billing_portal_price_not_allowed';
      error.message = 'Este preco ainda nao esta habilitado no Customer Portal do Stripe. Adicione o produto/preco nas configuracoes do portal para permitir troca de plano.';
    }

    logBillingDebug(env, 'portal:create_failed', {
      code: error.code || error.type || null,
      message: error.message,
      has_flow: Boolean(flowData),
    });
    throw error;
  }
};

export const syncStripeCustomerForUser = async ({ stripe, supabase, env = process.env, user, sessionId = null }) => {
  if (!stripe || !user?.id) return { synced: false, reason: 'stripe_or_user_unavailable' };

  const syncedSubscriptions = [];
  let customerId = null;

  if (sessionId) {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    customerId = getStripeId(session.customer);

    if (session.client_reference_id && session.client_reference_id !== user.id) {
      const error = new Error('Sessao de checkout pertence a outro usuario.');
      error.statusCode = 403;
      throw error;
    }

    if (session.mode === 'subscription' && session.subscription) {
      const subscription = typeof session.subscription === 'object'
        ? session.subscription
        : await stripe.subscriptions.retrieve(session.subscription, { expand: ['items.data.price.product'] });
      syncedSubscriptions.push(await upsertSubscriptionFromStripe({ stripe, supabase, env, subscription, fallbackUser: user }));
    }
  }

  const email = String(user.email || '').trim().toLowerCase();
  if (!customerId) {
    const { data: existing } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    customerId = existing?.stripe_customer_id || null;
  }

  if (!customerId && email) {
    const customers = await stripe.customers.list({ email, limit: 10 });
    const matchingCustomer = customers.data.find((customer) => !customer.deleted) || customers.data[0] || null;
    customerId = matchingCustomer?.id || null;
  }

  if (!customerId) {
    return { synced: syncedSubscriptions.some(Boolean), reason: 'stripe_customer_not_found' };
  }

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer?.deleted) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .in('status', ACTIVE_SUBSCRIPTION_STATUSES);

      await supabase
        .from('billing_customers')
        .delete()
        .eq('user_id', user.id);

      return { synced: true, reason: 'stripe_customer_deleted' };
    }
  } catch (error) {
    if (error?.type !== 'StripeInvalidRequestError') throw error;

    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .in('status', ACTIVE_SUBSCRIPTION_STATUSES);

    await supabase
      .from('billing_customers')
      .delete()
      .eq('user_id', user.id);

    return { synced: true, reason: 'stripe_customer_missing' };
  }

  await supabase.from('billing_customers').upsert({
    user_id: user.id,
    stripe_customer_id: customerId,
    email: user.email || null,
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id',
  });

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 100,
    expand: ['data.items.data.price'],
  });

  for (const subscription of subscriptions.data) {
    syncedSubscriptions.push(await upsertSubscriptionFromStripe({ stripe, supabase, env, subscription, fallbackUser: user }));
  }

  return {
    synced: syncedSubscriptions.some(Boolean),
    customer_id: customerId,
    subscriptions: syncedSubscriptions.filter(Boolean),
  };
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

export const getBillingOverview = async ({ supabase, stripe, env = process.env, userId, includePlans = true } = {}) => {
  const plansPromise = includePlans
    ? listBillingPlans({ stripe, env, includeFree: true }).catch((error) => {
        console.warn('Nao foi possivel listar planos Stripe:', error.message);
        return [FREE_PLAN];
      })
    : Promise.resolve([]);

  const [subscription, devicesUsed, plansResult, invoicesResult] = await Promise.all([
    getActiveSubscriptionRow({ supabase, userId }),
    getDeviceUsage({ supabase, userId }),
    plansPromise,
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
    plans: includePlans ? plansResult : [],
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

  const activeSubscription = await getActiveSubscriptionRow({ supabase, userId: user.id });
  const customerId = await getStripeCustomerForBilling({ stripe, supabase, user, activeSubscription });
  const successUrl = sanitizeReturnUrl(body.success_url || body.successUrl, { req, env });
  const cancelUrl = sanitizeReturnUrl(body.cancel_url || body.cancelUrl, { req, env });

  if (activeSubscription?.stripe_subscription_id) {
    if (activeSubscription.stripe_price_id === priceId) {
      const portalSession = await createPortalSession({
        stripe,
        env,
        customerId,
        returnUrl: cancelUrl,
      });

      return {
        mode: 'portal',
        reason: 'same_plan',
        url: portalSession.url,
        selected_plan: selectedPlan,
      };
    }

    const subscription = await stripe.subscriptions.retrieve(activeSubscription.stripe_subscription_id, {
      expand: ['items.data.price.product'],
    });

    if (getStripeId(subscription.customer) !== customerId) {
      const error = new Error('Assinatura Stripe nao pertence ao cliente autenticado.');
      error.statusCode = 403;
      error.code = 'subscription_customer_mismatch';
      throw error;
    }

    const subscriptionItem = subscription.items?.data?.[0];

    if (!subscriptionItem?.id) {
      const error = new Error('Assinatura Stripe sem item recorrente para troca de plano.');
      error.statusCode = 409;
      error.code = 'subscription_item_missing';
      throw error;
    }

    const portalSession = await createPortalSession({
      stripe,
      env,
      customerId,
      returnUrl: cancelUrl,
      flowData: {
        type: 'subscription_update_confirm',
        subscription_update_confirm: {
          subscription: subscription.id,
          items: [
            {
              id: subscriptionItem.id,
              price: priceId,
              quantity: subscriptionItem.quantity || 1,
            },
          ],
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            return_url: successUrl,
          },
        },
      },
    });

    logBillingDebug(env, 'portal:plan_change_created', {
      customer_id: customerId,
      subscription_id: subscription.id,
      subscription_item_id: subscriptionItem.id,
      price_id: priceId,
      plan_key: selectedPlan.key,
    });

    return {
      mode: 'portal_plan_change',
      reason: 'existing_subscription_plan_change',
      url: portalSession.url,
      return_url: cancelUrl,
      subscription_id: subscription.id,
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

  const activeSubscription = await getActiveSubscriptionRow({ supabase, userId: user.id });
  const customerId = await getStripeCustomerForBilling({ stripe, supabase, user, activeSubscription });
  const returnUrl = sanitizeReturnUrl(body.return_url || body.returnUrl, { req, env });

  const portalSession = await createPortalSession({
    stripe,
    env,
    customerId,
    returnUrl,
  });

  logBillingDebug(env, 'portal:created', {
    customer_id: customerId,
    has_active_subscription: Boolean(activeSubscription?.stripe_subscription_id),
    return_url: returnUrl,
  });

  return {
    url: portalSession.url,
    customer_id: customerId,
  };
};

export const upsertSubscriptionFromStripe = async ({ stripe, supabase, env = process.env, subscription, fallbackUser = null }) => {
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
  let customerEmail = expandedSubscription.customer_email ||
    (typeof expandedSubscription.customer === 'object' ? expandedSubscription.customer?.email : null) ||
    fallbackUser?.email ||
    null;

  if (!customerEmail && customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      customerEmail = customer?.deleted ? null : customer?.email || null;
    } catch (error) {
      console.warn(`Nao foi possivel buscar email do customer ${customerId}:`, error.message);
    }
  }
  const userId =
    expandedSubscription.metadata?.user_id ||
    fallbackUser?.id ||
    await findUserIdByStripeCustomer({ supabase, customerId }) ||
    await findUserIdByEmail({ supabase, email: customerEmail });

  if (!userId) {
    console.warn(`Assinatura ${expandedSubscription.id} recebida sem usuario SmartControl associado.`);
    return null;
  }

  const row = {
    user_id: userId,
    email: customerEmail,
    stripe_customer_id: customerId,
    stripe_subscription_id: expandedSubscription.id,
    stripe_price_id: price?.id || expandedSubscription.metadata?.price_id || null,
    stripe_product_id: productId,
    plan_key: plan.key,
    plan_name: plan.name,
    status: expandedSubscription.status,
    device_limit: plan.device_limit,
    period: plan.recurring?.interval || 'month',
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

  let { error } = await supabase
    .from('subscriptions')
    .upsert(row, {
      onConflict: 'stripe_subscription_id',
    });

  if (error && shouldRetryWithoutNewColumns(error)) {
    const { email, device_limit: deviceLimit, period, ...fallbackRow } = row;
    const fallback = await supabase
      .from('subscriptions')
      .upsert(fallbackRow, {
        onConflict: 'stripe_subscription_id',
      });
    error = fallback.error;
  }

  if (error) throw error;

  await supabase.from('billing_customers').upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    email: customerEmail,
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
