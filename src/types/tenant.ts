import type { SubscriptionStatus } from './admin';

export interface Tenant {
  id: string;
  name: string;
  currency: string;
  logoDataUri: string | null;
  subscription: SubscriptionStatus;
}
