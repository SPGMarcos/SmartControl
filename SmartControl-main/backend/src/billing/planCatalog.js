export const FREE_PLAN_KEY = 'free';

export const FREE_PLAN = {
  id: FREE_PLAN_KEY,
  key: FREE_PLAN_KEY,
  name: 'SmartControl Free',
  profile: 'Primeiros testes',
  description: 'Plano gratuito para validar a automacao com ate 3 dispositivos.',
  stripe_price_id: null,
  stripe_product_id: null,
  unit_amount: 0,
  currency: 'brl',
  recurring: { interval: 'month', interval_count: 1 },
  device_limit: 3,
  features: [
    'Ate 3 dispositivos',
    'Dashboard em tempo real',
    'Controle MQTT basico',
    'Monitoramento individual essencial',
  ],
  permissions: {
    devices: 3,
    advanced_monitoring: false,
    subscription_portal: false,
    mqtt_commands: true,
  },
  metadata: {},
  sort: 0,
  active: true,
  is_free: true,
  checkout_available: false,
};

export const STRIPE_PLAN_CONFIGS = [
  {
    key: 'residencial_smart',
    env: 'STRIPE_PRICE_RESIDENCIAL_SMART',
    profile: 'Usuarios residenciais',
    sort: 10,
    deviceLimit: 10,
    features: ['Ate 10 dispositivos', 'Alertas basicos', 'Controle via painel web', 'Preparado para voz e Home Assistant'],
  },
  {
    key: 'horta_urbana',
    env: 'STRIPE_PRICE_HORTA_URBANA',
    profile: 'Hortas urbanas',
    sort: 20,
    deviceLimit: 12,
    features: ['Irrigacao por setores', 'Sensores ambientais', 'Historico de acionamentos', 'Suporte de implantacao'],
  },
  {
    key: 'produtor_essencial',
    env: 'STRIPE_PRICE_PRODUTOR_ESSENCIAL',
    profile: 'Pequenos produtores',
    sort: 30,
    deviceLimit: 25,
    features: ['Ate 25 dispositivos', 'Rotinas de automacao', 'Monitoramento remoto', 'Integracao com ESP32/ESP8266'],
  },
  {
    key: 'agro_profissional',
    env: 'STRIPE_PRICE_AGRO_PROFISSIONAL',
    profile: 'Agricultores',
    sort: 40,
    deviceLimit: 60,
    features: ['Projetos por area', 'Controle de bombas', 'Status online/offline', 'Base para MQTT e integracoes externas'],
  },
  {
    key: 'estufa_inteligente',
    env: 'STRIPE_PRICE_ESTUFA_INTELIGENTE',
    profile: 'Estufas automatizadas',
    sort: 50,
    deviceLimit: 40,
    features: ['Sensores de ambiente', 'Controle climatico', 'Alertas operacionais', 'Dashboard centralizado'],
  },
  {
    key: 'agro_escala',
    env: 'STRIPE_PRICE_AGRO_ESCALA',
    profile: 'Grandes produtores',
    sort: 60,
    deviceLimit: 150,
    features: ['Multiplas unidades', 'Arquitetura escalavel', 'Suporte personalizado', 'Integracoes futuras com voz e cloud'],
  },
];

export const normalizePlanKey = (value = '') =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'smartcontrol_plan';

export const parseMetadataList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);

  const text = String(value).trim();
  if (!text) return [];

  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      // Fall through to delimiter parsing.
    }
  }

  return text
    .split(/\r?\n|\||;|,/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const parseBooleanMetadata = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value !== 'string') return fallback;

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'sim', 'on', 'enabled'].includes(normalized)) return true;
  if (['false', '0', 'no', 'nao', 'off', 'disabled'].includes(normalized)) return false;

  return fallback;
};

export const toPositiveInteger = (value, fallback = null) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.round(number);
};

export const getConfiguredPlanPriceIds = (env = process.env) =>
  STRIPE_PLAN_CONFIGS
    .map((config) => ({
      ...config,
      priceId: String(env[config.env] || '').trim(),
    }))
    .filter((config) => Boolean(config.priceId));

export const getPlanConfigByPriceId = (priceId, env = process.env) =>
  getConfiguredPlanPriceIds(env).find((config) => config.priceId === priceId) || null;

export const getPlanConfigByKey = (key) =>
  STRIPE_PLAN_CONFIGS.find((config) => config.key === key || normalizePlanKey(config.key) === normalizePlanKey(key)) || null;

export const buildPlanPermissions = (plan = FREE_PLAN) => {
  const metadata = plan.metadata || {};
  const deviceLimit = toPositiveInteger(plan.device_limit, FREE_PLAN.device_limit);

  return {
    devices: deviceLimit,
    advanced_monitoring: parseBooleanMetadata(metadata.advanced_monitoring, plan.key !== FREE_PLAN_KEY),
    subscription_portal: !plan.is_free,
    mqtt_commands: parseBooleanMetadata(metadata.mqtt_commands, true),
    device_history: parseBooleanMetadata(metadata.device_history, true),
    team_users: toPositiveInteger(metadata.team_users, plan.key === FREE_PLAN_KEY ? 1 : 3),
  };
};

export const normalizePlanFromStripePrice = ({ price, env = process.env, config = null }) => {
  const product = typeof price.product === 'object' && price.product ? price.product : {};
  const productMetadata = product.metadata || {};
  const priceMetadata = price.metadata || {};
  const metadata = {
    ...productMetadata,
    ...priceMetadata,
  };
  const key = normalizePlanKey(
    metadata.plan_key ||
    metadata.smartcontrol_plan_key ||
    metadata.smartcontrol_plan ||
    config?.key ||
    price.lookup_key ||
    product.name ||
    price.id,
  );
  const planConfig = config || getPlanConfigByKey(key) || getPlanConfigByPriceId(price.id, env);
  const features = parseMetadataList(metadata.features || metadata.benefits || metadata.resources);
  const deviceLimit = toPositiveInteger(
    metadata.device_limit || metadata.devices || metadata.max_devices,
    planConfig?.deviceLimit || FREE_PLAN.device_limit,
  );

  const plan = {
    id: price.id,
    key,
    name: product.name || planConfig?.key || 'Plano SmartControl',
    profile: metadata.profile || metadata.customer_profile || planConfig?.profile || 'Perfil SmartControl',
    description: product.description || metadata.description || 'Plano SmartControl sincronizado com Stripe.',
    stripe_price_id: price.id,
    stripe_product_id: product.id || null,
    unit_amount: price.unit_amount ?? null,
    currency: price.currency || 'brl',
    recurring: price.recurring || null,
    device_limit: deviceLimit,
    features: features.length > 0 ? features : (planConfig?.features || []),
    metadata,
    sort: toPositiveInteger(metadata.sort_order || metadata.order, planConfig?.sort || 100),
    active: price.active !== false && product.active !== false,
    is_free: false,
    checkout_available: Boolean(price.id),
  };

  return {
    ...plan,
    permissions: buildPlanPermissions(plan),
  };
};

export const normalizePlanFromSubscriptionRow = (subscription = null) => {
  if (!subscription) return FREE_PLAN;

  const metadata = subscription.metadata || {};
  const storedPlan = metadata.plan || {};
  const key = normalizePlanKey(subscription.plan_key || storedPlan.key || subscription.stripe_price_id || FREE_PLAN_KEY);
  const config = getPlanConfigByKey(key);
  const deviceLimit = toPositiveInteger(
    metadata.device_limit || storedPlan.device_limit || config?.deviceLimit,
    config?.deviceLimit || FREE_PLAN.device_limit,
  );
  const plan = {
    ...FREE_PLAN,
    id: subscription.stripe_price_id || key,
    key,
    name: subscription.plan_name || storedPlan.name || config?.key || 'Plano SmartControl',
    profile: storedPlan.profile || config?.profile || 'Assinatura ativa',
    description: storedPlan.description || 'Plano sincronizado pela assinatura ativa no Stripe.',
    stripe_price_id: subscription.stripe_price_id,
    stripe_product_id: subscription.stripe_product_id,
    unit_amount: storedPlan.unit_amount ?? null,
    currency: storedPlan.currency || 'brl',
    recurring: storedPlan.recurring || { interval: 'month', interval_count: 1 },
    device_limit: deviceLimit,
    features: storedPlan.features || config?.features || FREE_PLAN.features,
    metadata,
    sort: storedPlan.sort || config?.sort || 100,
    is_free: false,
    checkout_available: Boolean(subscription.stripe_price_id),
  };

  return {
    ...plan,
    permissions: buildPlanPermissions(plan),
  };
};
