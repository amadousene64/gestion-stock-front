export interface SubscriptionLimits {
  maxStores: number | null;
  maxUsers: number | null;
  maxProducts: number | null;
  maxSalesPerMonth: number | null;
  features: string[];
  monthlyFcfa: number;
  annualFcfa: number;
  businessMonthlyFcfa?: number;
  businessAnnualFcfa?: number;
}

export interface SubscriptionStatus {
  status: string;
  tier: string;
  billingCycle: string | null;
  trialEndsAt: string | null;
  expiresAt: string | null;
  daysLeft: number | null;
  limits: SubscriptionLimits;
}

export interface AdminTenantSummary {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  subscription: SubscriptionStatus;
}

export interface SubscriptionEvent {
  id: string;
  eventType: string;
  tier: string;
  billingCycle: string | null;
  validFrom: string;
  validUntil: string | null;
  amountPaid: number | null;
  paymentMethod: string | null;
  paymentRef: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AdminTenantDetail extends AdminTenantSummary {
  events: SubscriptionEvent[];
}

export interface ActivateSubscriptionRequest {
  tier: string;
  billingCycle?: string | null;
  durationMonths?: number | null;  // ignoré si billingCycle = "lifetime"
  amountPaid?: number | null;
  paymentMethod?: string | null;
  paymentRef?: string | null;
  notes?: string | null;
}

export function isLifetime(sub: Pick<SubscriptionStatus, 'billingCycle' | 'expiresAt'>): boolean {
  return sub.billingCycle === 'lifetime' || sub.expiresAt === null;
}
