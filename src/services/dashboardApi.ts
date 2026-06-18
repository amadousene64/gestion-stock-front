import { api } from '../lib/api';
import type { DashboardSummary } from '../types/dashboard';

export const dashboardApi = {
  getSummary: (storeId?: string | null) =>
    api.get<DashboardSummary>('/api/dashboard', {
      params: storeId ? { storeId } : {},
    }).then(r => r.data),
};
