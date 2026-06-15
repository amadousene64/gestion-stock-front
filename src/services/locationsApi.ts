import { api } from '../lib/api';
import type { Location } from '../types/location';

export interface LocationDto {
  name: string;
  type: 'store_floor' | 'store_warehouse' | 'shared_warehouse';
  storeId?: string | null;
}

export const locationsApi = {
  list:   ()                                  => api.get<Location[]>('/api/locations').then(r => r.data),
  create: (dto: LocationDto)                  => api.post<Location>('/api/locations', dto).then(r => r.data),
  update: (id: string, dto: LocationDto)      => api.put<Location>(`/api/locations/${id}`, dto).then(r => r.data),
  remove: (id: string)                        => api.delete(`/api/locations/${id}`),
};
