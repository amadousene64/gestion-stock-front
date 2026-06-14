import { api } from '../lib/api';
import type { Boutique, BoutiqueDto } from '../types/boutique';

export const boutiquesApi = {
  list:   ()                              => api.get<Boutique[]>('/api/stores').then(r => r.data),
  create: (dto: BoutiqueDto)             => api.post<Boutique>('/api/stores', dto).then(r => r.data),
  update: (id: string, dto: BoutiqueDto) => api.put<Boutique>(`/api/stores/${id}`, dto).then(r => r.data),
  remove: (id: string)                   => api.delete(`/api/stores/${id}`),
};
