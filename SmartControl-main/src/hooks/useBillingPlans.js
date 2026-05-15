import { useCallback, useEffect, useRef, useState } from 'react';
import { dedupeBillingPlans, fetchBillingJson } from '@/lib/billing';

export const useBillingPlans = ({ includeFree = false } = {}) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [stripeMode, setStripeMode] = useState('unknown');
  const requestSeqRef = useRef(0);

  const refresh = useCallback(async ({ signal } = {}) => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    setLoading(true);
    setError('');

    try {
      const query = includeFree ? '?include_free=true' : '';
      const payload = await fetchBillingJson(`/api/billing/plans${query}`, { signal });
      if (signal?.aborted || requestSeq !== requestSeqRef.current) return;

      const receivedPlans = payload.plans || [];
      setPlans(dedupeBillingPlans(receivedPlans, { includeFree, source: 'useBillingPlans' }));
      setStripeConfigured(Boolean(payload.stripe_configured));
      setStripeMode(payload.stripe_mode || (payload.test_mode ? 'test' : 'live'));
    } catch (requestError) {
      if (requestError.name === 'AbortError') return;
      if (requestSeq !== requestSeqRef.current) return;

      setPlans([]);
      setError(requestError.message || 'Nao foi possivel carregar os planos.');
      setStripeConfigured(false);
      setStripeMode('unknown');
    } finally {
      if (!signal?.aborted && requestSeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [includeFree]);

  useEffect(() => {
    const controller = new AbortController();
    refresh({ signal: controller.signal });
    return () => controller.abort();
  }, [refresh]);

  return {
    plans,
    loading,
    error,
    stripeConfigured,
    stripeMode,
    refresh,
  };
};
