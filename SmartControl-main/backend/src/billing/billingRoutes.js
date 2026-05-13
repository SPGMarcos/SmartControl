import express from 'express';
import {
  createBillingPortalSession,
  createCheckoutSession,
  getBillingOverview,
  handleStripeEvent,
  listBillingPlans,
} from './billingService.js';

const requireUser = async (req, res, getRequestUser) => {
  const user = await getRequestUser(req);
  if (!user) {
    res.status(401).json({ error: 'Autenticacao obrigatoria.' });
    return null;
  }

  return user;
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
      const result = await handleStripeEvent({ stripe, supabase, env, event });
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
      });

      return res.json(overview);
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
      return res.status(500).json({ error: 'Nao foi possivel carregar a assinatura.' });
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
      });
    }
  });
};
