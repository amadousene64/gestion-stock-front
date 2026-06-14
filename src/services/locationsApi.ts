import { api } from '../lib/api';
import type { Location } from '../types/location';

export const locationsApi = {
  list: () => api.get<Location[]>('/api/locations').then(r => r.data),
};
