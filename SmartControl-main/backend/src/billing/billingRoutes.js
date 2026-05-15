import express from 'express';
import {
  createBillingPortalSession,
  createCheckoutSession,
  getBillingOverview,
  handleStripeEvent,
  listBillingPlans,
  syncStripeCustomerForUser,
} from './billingService.js';

const requireUser = async (req, res, getRequestUser) => {
  const user = await getRequestUser(req);
  if (!user) {
    res.status(401).json({ error: 'Autenticacao obrigatoria.' });
    return null;
  }

  return user;
};

const shouldIgnoreSchemaError = (error) => {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return message.includes('column') || message.includes('schema') || message.includes('cache') || message.includes('relation');
};

const registerWebhookEventStart = async ({ supabase, event }) => {
  const { error } = await supabase.from('stripe_webhook_events').insert([{
    event_id: event.id,
    event_type: event.type,
    object_id: event.data?.object?.id || null,
    status: 'processing',
    payload: {
      livemode: event.livemode,
      api_version: event.api_version,
      pending_webhooks: event.pending_webhooks,
    },
  }]);

  if (!error) return { duplicate: false, available: true };
  if (error.code === '23505') return { duplicate: true, available: true };
  if (shouldIgnoreSchemaError(error)) return { duplicate: false, available: false };

  console.warn('Nao foi possivel registrar evento Stripe antes do processamento:', error.message);
  return { duplicate: false, available: false };
};

const markWebhookEventFinished = async ({ supabase, event, status, errorMessage = null }) => {
  const { error } = await supabase
    .from('stripe_webhook_events')
    .update({
      status,
      processed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('event_id', event.id);

  if (error && !shouldIgnoreSchemaError(error)) {
    console.warn('Nao foi possivel atualizar status do evento Stripe:', error.message);
  }
};

export const registerStripeWebhookRoute = (app, { stripe, supabase, env = process.env, logEvent }) => {
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe nao configurado.' });
    }

    const signature = req.headers['stripe-signature'];
    let event;

    try {
      if (env.STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(req.body, signature, env.STRIPE_WEBHOOK_SECRET);
      } else {
        event = JSON.parse(req.body.toString('utf8'));
        console.warn('STRIPE_WEBHOOK_SECRET ausente. Webhook aceito apenas para ambiente local.');
      }
    } catch (error) {
      console.error('Webhook Stripe invalido:', error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
      const webhookRegistration = await registerWebhookEventStart({ supabase, event });
      if (webhookRegistration.duplicate) {
        await logEvent?.({
          type: `stripe_duplicate_${event.type}`,
          payload: {
            event_id: event.id,
            object_id: event.data?.object?.id,
          },
        });
        return res.json({ received: true, duplicate: true });
      }

      const result = await handleStripeEvent({ stripe, supabase, env, event });
      await markWebhookEventFinished({ supabase, event, status: 'processed' });
      await logEvent?.({
        userId: result?.user_id || null,
        type: `stripe_${event.type}`,
        payload: {
          event_id: event.id,
          object_id: event.data?.object?.id,
          handled: Boolean(result),
        },
      });

      return res.json({ received: true });
    } catch (error) {
      console.error('Erro ao processar webhook Stripe:', error);
      await markWebhookEventFinished({
        supabase,
        event,
        status: 'failed',
        errorMessage: error.message || 'webhook_failed',
      });
      return res.status(500).json({ error: 'Falha ao processar webhook Stripe.' });
    }
  });
};

export const registerBillingRoutes = (app, { stripe, supabase, env = process.env, getRequestUser, logEvent }) => {
  app.get('/api/billing/plans', async (req, res) => {
    try {
      const includeFree = req.query.include_free === 'true';
      const plans = await listBillingPlans({
        stripe,
        env,
        includeFree,
        forceRefresh: req.query.refresh === 'true',
      });

      return res.json({
        stripe_configured: Boolean(stripe),
        stripe_mode: env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'test' : 'live',
        test_mode: env.STRIPE_SECRET_KEY?.startsWith('sk_test_') || false,
        plans,
      });
    } catch (error) {
      console.error('Erro ao listar planos Stripe:', error);
      return res.status(500).json({ error: 'Nao foi possivel carregar os planos.' });
    }
  });

  app.get('/api/billing/subscription', async (req, res) => {
    const user = await requireUser(req, res, getRequestUser);
    if (!user) return;

    try {
      const overview = await getBillingOverview({
        supabase,
        stripe,
        env,
        userId: user.id,
        includePlans: req.query.include_plans !== 'false',
      });

      return res.json(overview);
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
      return res.status(500).json({ error: 'Nao foi possivel carregar a assinatura.' });
    }
  });

  app.post('/api/billing/sync', async (req, res) => {
    const user = await requireUser(req, res, getRequestUser);
    if (!user) return;

    try {
      const syncResult = await syncStripeCustomerForUser({
        stripe,
        supabase,
        env,
        user,
        sessionId: req.body?.session_id || req.body?.sessionId || null,
      });
      const overview = await getBillingOverview({
        supabase,
        stripe,
        env,
        userId: user.id,
        includePlans: req.body?.include_plans !== false && req.body?.includePlans !== false,
      });

      await logEvent?.({
        userId: user.id,
        type: 'stripe_manual_sync',
        payload: {
          synced: syncResult.synced,
          customer_id: syncResult.customer_id || null,
          subscription_count: syncResult.subscriptions?.length || 0,
        },
      });

      return res.json({
        ...overview,
        sync: syncResult,
      });
    } catch (error) {
      console.error('Erro ao sincronizar assinatura Stripe:', error);
      return res.status(error.statusCode || 400).json({
        error: error.message || 'Nao foi possivel sincronizar a assinatura.',
        code: 'subscription_sync_failed',
      });
    }
  });

  app.post('/api/billing/checkout', async (req, res) => {
    const user = await requireUser(req, res, getRequestUser);
    if (!user) return;

    try {
      const result = await createCheckoutSession({
        stripe,
        supabase,
        env,
        req,
        user,
        body: req.body || {},
      });

      await logEvent?.({
        userId: user.id,
        type: 'stripe_checkout_created',
        payload: {
          mode: result.mode,
          price_id: result.selected_plan?.stripe_price_id,
          plan_key: result.selected_plan?.key,
        },
      });

      return res.json(result);
    } catch (error) {
      console.error('Erro ao iniciar checkout Stripe:', error);
      return res.status(error.statusCode || 400).json({
        error: error.message || 'Nao foi possivel iniciar checkout.',
        code: error.code || 'checkout_failed',
      });
    }
  });

  app.post('/api/billing/portal', async (req, res) => {
    const user = await requireUser(req, res, getRequestUser);
    if (!user) return;

    try {
      const result = await createBillingPortalSession({
        stripe,
        supabase,
        env,
        req,
        user,
        body: req.body || {},
      });

      await logEvent?.({
        userId: user.id,
        type: 'stripe_portal_created',
        payload: { customer_portal: true },
      });

      return res.json(result);
    } catch (error) {
      console.error('Erro ao abrir portal Stripe:', error);
      return res.status(error.statusCode || 400).json({
        error: error.message || 'Nao foi possivel abrir o portal de assinatura.',
        code: error.code || 'billing_portal_failed',
      });
    }
  });
};
