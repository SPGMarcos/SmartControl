import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { FREE_PLAN, fetchBillingJson } from '@/lib/billing';

const buildFallbackOverview = () => ({
  subscription: null,
  current_plan: FREE_PLAN,
  limits: {
    device_limit: 3,
    devices_used: 0,
    devices_remaining: 3,
    can_add_device: true,
  },
  permissions: FREE_PLAN.permissions,
  invoices: [],
  plans: [FREE_PLAN],
});

export const useSubscription = () => {
  const { user, session } = useAuth();
  const [overview, setOverview] = useState(() => buildFallbackOverview());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const syncedOnLoginRef = useRef('');

  const refresh = useCallback(async () => {
    if (!session?.access_token || !user?.id) {
      setOverview(buildFallbackOverview());
      setLoading(false);
      return;
    }

    setError('');

    try {
      const payload = await fetchBillingJson('/api/billing/subscription', {
        token: session.access_token,
      });
      setOverview({
        ...buildFallbackOverview(),
        ...payload,
      });
    } catch (requestError) {
      setError(requestError.message || 'Nao foi possivel carregar a assinatura.');
      setOverview((current) => current || buildFallbackOverview());
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, user?.id]);

  const sync = useCallback(async ({ sessionId } = {}) => {
    if (!session?.access_token || !user?.id) return buildFallbackOverview();

    setError('');
    const payload = await fetchBillingJson('/api/billing/sync', {
      token: session.access_token,
      method: 'POST',
      body: sessionId ? { session_id: sessionId } : {},
    });
    setOverview({
      ...buildFallbackOverview(),
      ...payload,
    });
    return payload;
  }, [session?.access_token, user?.id]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!session?.access_token || !user?.id) return;
    if (syncedOnLoginRef.current === user.id) return;
    syncedOnLoginRef.current = user.id;

    window.setTimeout(() => {
      sync().catch((syncError) => {
        console.warn('Sincronizacao Stripe no login nao concluida:', syncError.message);
      });
    }, 500);
  }, [session?.access_token, sync, user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const refreshSoon = () => window.setTimeout(refresh, 120);
    const subscriptionChannel = supabase
      .channel(`billing-subscriptions:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${user.id}`,
      }, refreshSoon)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscription_invoices',
        filter: `user_id=eq.${user.id}`,
      }, refreshSoon)
      .subscribe();

    return () => {
      supabase.removeChannel(subscriptionChannel);
    };
  }, [refresh, user?.id]);

  return useMemo(() => ({
    overview,
    subscription: overview.subscription,
    currentPlan: overview.current_plan || FREE_PLAN,
    limits: overview.limits || buildFallbackOverview().limits,
    permissions: overview.permissions || FREE_PLAN.permissions,
    invoices: overview.invoices || [],
    plans: overview.plans || [],
    loading,
    error,
    refresh,
    sync,
  }), [error, loading, overview, refresh, sync]);
};
