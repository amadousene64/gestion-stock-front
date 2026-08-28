import { api } from '../lib/api';
import type { ActivityPage } from '../types/activity';

export interface ActivityFilters {
  storeId?: string;
  from?: string;   // "YYYY-MM-DD"
  to?: string;     // "YYYY-MM-DD"
  page?: number;
  size?: number;
}

export const activityApi = {
  list: (filters?: ActivityFilters) =>
    api.get<ActivityPage>('/api/activity', { params: filters }).then(r => r.data),
};
