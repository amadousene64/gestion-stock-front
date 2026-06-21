import { useTenant } from '../contexts/TenantContext';
import type { SubscriptionStatus } from '../types/admin';
import { isLifetime } from '../types/admin';

const FREE_DEFAULT: SubscriptionStatus = {
  status: 'free',
  tier: 'free',
  billingCycle: null,
  trialEndsAt: null,
  expiresAt: null,
  daysLeft: null,
  limits: {
    maxStores: 1,
    maxUsers: 1,
    maxProducts: 20,
    maxSalesPerMonth: 100,
    features: ['CAISSE', 'CLIENTS', 'STOCK', 'DEPENSES'],
    monthlyFcfa: 5000,
    annualFcfa: 50000,
    businessMonthlyFcfa: 15000,
    businessAnnualFcfa: 150000,
  },
};

export function useSubscription() {
  const { tenant, loading } = useTenant();
  const sub: SubscriptionStatus = tenant?.subscription ?? FREE_DEFAULT;
  const isLoading = loading && !tenant;

  return {
    status: sub.status,
    tier: sub.tier,
    billingCycle: sub.billingCycle,
    daysLeft: sub.daysLeft,
    expiresAt: sub.expiresAt,
    trialEndsAt: sub.trialEndsAt,
    limits: sub.limits,
    isLifetime: isLifetime(sub),
    isBlocked: sub.status === 'expired',
    isLoading,
    hasFeature: (feature: string) =>
      isLoading || sub.limits.features.includes(feature),
  };
}
