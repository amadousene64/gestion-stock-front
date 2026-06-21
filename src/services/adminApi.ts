import { api } from '../lib/api';
import type { AdminTenantSummary, AdminTenantDetail, ActivateSubscriptionRequest, SubscriptionStatus } from '../types/admin';

export const adminApi = {
  listTenants(): Promise<AdminTenantSummary[]> {
    return api.get<AdminTenantSummary[]>('/api/admin/tenants').then(r => r.data);
  },

  getTenant(id: string): Promise<AdminTenantDetail> {
    return api.get<AdminTenantDetail>(`/api/admin/tenants/${id}`).then(r => r.data);
  },

  activateSubscription(id: string, req: ActivateSubscriptionRequest): Promise<SubscriptionStatus> {
    return api.post<SubscriptionStatus>(`/api/admin/tenants/${id}/subscription`, req).then(r => r.data);
  },

  suspend(id: string, motif?: string): Promise<SubscriptionStatus> {
    return api.post<SubscriptionStatus>(`/api/admin/tenants/${id}/suspend`, { motif }).then(r => r.data);
  },

  reactivate(id: string): Promise<SubscriptionStatus> {
    return api.post<SubscriptionStatus>(`/api/admin/tenants/${id}/reactivate`).then(r => r.data);
  },
};
