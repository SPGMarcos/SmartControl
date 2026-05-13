import { useCallback, useEffect, useState } from 'react';
import { fetchBillingJson } from '@/lib/billing';

export const useBillingPlans = ({ includeFree = false } = {}) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stripeConfigured, setStripeConfigured] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const query = includeFree ? '?include_free=true' : '';
      const payload = await fetchBillingJson(`/api/billing/plans${query}`);
      setPlans(payload.plans || []);
      setStripeConfigured(Boolean(payload.stripe_configured));
    } catch (requestError) {
      setPlans([]);
      setError(requestError.message || 'Nao foi possivel carregar os planos.');
      setStripeConfigured(false);
    } finally {
      setLoading(false);
    }
  }, [includeFree]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    plans,
    loading,
    error,
    stripeConfigured,
    refresh,
  };
};
