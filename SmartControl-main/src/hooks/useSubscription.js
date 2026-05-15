import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { FREE_PLAN, dedupeBillingPlans, fetchBillingJson } from '@/lib/billing';

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

const buildPendingOverview = () => ({
  subscription: null,
  current_plan: null,
  limits: null,
  permissions: null,
  invoices: [],
  plans: [],
});

export const useSubscription = () => {
  const { user, session } = useAuth();
  const [overview, setOverview] = useState(() => buildPendingOverview());
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState('');
  const syncedOnLoginRef = useRef('');
  const requestSeqRef = useRef(0);
  const refreshTimersRef = useRef([]);

  const normalizeOverview = useCallback((payload = {}) => ({
    ...buildFallbackOverview(),
    ...payload,
    plans: dedupeBillingPlans(payload.plans || [], {
      includeFree: true,
      source: 'useSubscription',
    }),
  }), []);

  const refresh = useCallback(async ({ signal } = {}) => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;

    if (!session?.access_token || !user?.id) {
      setOverview(buildFallbackOverview());
      setLoading(false);
      return;
    }

    setError('');

    try {
      const payload = await fetchBillingJson('/api/billing/subscription?include_plans=false', {
        token: session.access_token,
        signal,
      });
      if (signal?.aborted || requestSeq !== requestSeqRef.current) return;
      setOverview(normalizeOverview(payload));
      setHasLoadedOnce(true);
    } catch (requestError) {
      if (requestError.name === 'AbortError') return;
      if (requestSeq !== requestSeqRef.current) return;

      setError(requestError.message || 'Nao foi possivel carregar a assinatura.');
      setOverview((current) => current || buildFallbackOverview());
    } finally {
      if (!signal?.aborted && requestSeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [normalizeOverview, session?.access_token, user?.id]);

  const sync = useCallback(async ({ sessionId } = {}) => {
    if (!session?.access_token || !user?.id) return buildFallbackOverview();

    requestSeqRef.current += 1;
    setError('');
    const payload = await fetchBillingJson('/api/billing/sync', {
      token: session.access_token,
      method: 'POST',
      body: {
        ...(sessionId ? { session_id: sessionId } : {}),
        include_plans: false,
      },
    });
    setOverview(normalizeOverview(payload));
    setHasLoadedOnce(true);
    return payload;
  }, [normalizeOverview, session?.access_token, user?.id]);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    refresh({ signal: controller.signal });
    return () => controller.abort();
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

    const refreshSoon = () => {
      const timeoutId = window.setTimeout(() => {
        refreshTimersRef.current = refreshTimersRef.current.filter((item) => item !== timeoutId);
        refresh();
      }, 120);
      refreshTimersRef.current.push(timeoutId);
    };
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
      refreshTimersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      refreshTimersRef.current = [];
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
    hasLoadedOnce,
    error,
    refresh,
    sync,
  }), [error, hasLoadedOnce, loading, overview, refresh, sync]);
};
