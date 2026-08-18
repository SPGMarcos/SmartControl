import 'dotenv/config';
import Stripe from 'stripe';
import { STRIPE_PLAN_CONFIGS } from '../src/billing/planCatalog.js';

const PLAN_DETAILS = {
  residencial_smart: {
    name: 'SmartControl Residencial Smart',
    description: 'Automacao residencial com painel web, MQTT e monitoramento essencial.',
    amountEnv: 'STRIPE_AMOUNT_RESIDENCIAL_SMART',
    defaultAmount: '49.90',
  },
  horta_urbana: {
    name: 'SmartControl Horta Urbana',
    description: 'Irrigacao e sensores para hortas urbanas e pequenos cultivos.',
    amountEnv: 'STRIPE_AMOUNT_HORTA_URBANA',
    defaultAmount: '79.90',
  },
  produtor_essencial: {
    name: 'SmartControl Produtor Essencial',
    description: 'Automacao remota para pequenos produtores com ate 25 dispositivos.',
    amountEnv: 'STRIPE_AMOUNT_PRODUTOR_ESSENCIAL',
    defaultAmount: '149.90',
  },
  estufa_inteligente: {
    name: 'SmartControl Estufa Inteligente',
    description: 'Monitoramento e controle de estufas automatizadas.',
    amountEnv: 'STRIPE_AMOUNT_ESTUFA_INTELIGENTE',
    defaultAmount: '249.90',
  },
  agro_escala: {
    name: 'SmartControl Agro Escala',
    description: 'Plano escalavel para multiplas unidades e grandes produtores.',
    amountEnv: 'STRIPE_AMOUNT_AGRO_ESCALA',
    defaultAmount: '799.90',
  },
};

const parseAmountInCents = (value) => {
  const normalized = String(value || '').trim().replace(',', '.');
  if (!normalized) return null;

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  return Math.round(numeric * 100);
};

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Defina STRIPE_SECRET_KEY no backend/.env antes de provisionar os planos.');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: process.env.STRIPE_API_VERSION || undefined,
});

const findExistingProduct = async (planKey) => {
  const products = await stripe.products.search({
    query: `metadata['platform']:'smartcontrol' AND metadata['plan_key']:'${planKey}'`,
    limit: 1,
  });

  return products.data[0] || null;
};

const createOrUpdatePlan = async (config) => {
  const details = PLAN_DETAILS[config.key];
  const amount = parseAmountInCents(process.env[details.amountEnv] || details.defaultAmount);
  const features = config.features.join('|');
  const commonMetadata = {
    platform: 'smartcontrol',
    smartcontrol: 'true',
    plan_key: config.key,
    profile: config.profile,
    device_limit: String(config.deviceLimit),
    sort_order: String(config.sort),
    features,
    advanced_monitoring: 'true',
    mqtt_commands: 'true',
    device_history: 'true',
    suggested_monthly_amount_brl: details.defaultAmount,
  };

  const product = await findExistingProduct(config.key) || await stripe.products.create({
    name: details.name,
    description: details.description,
    metadata: commonMetadata,
  });

  if (product.name !== details.name || product.description !== details.description) {
    await stripe.products.update(product.id, {
      name: details.name,
      description: details.description,
      metadata: {
        ...(product.metadata || {}),
        ...commonMetadata,
      },
    });
  }

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: 'brl',
    recurring: {
      interval: 'month',
      interval_count: 1,
    },
    lookup_key: `smartcontrol_${config.key}_monthly`,
    metadata: commonMetadata,
  });

  return {
    key: config.key,
    env: config.env,
    productId: product.id,
    priceId: price.id,
    amount,
  };
};

const created = [];

for (const config of STRIPE_PLAN_CONFIGS) {
  created.push(await createOrUpdatePlan(config));
}

console.log('Planos SmartControl criados no Stripe. Atualize estas variaveis no Render:');
created.forEach((plan) => {
  console.log(`${plan.env}=${plan.priceId}`);
});
