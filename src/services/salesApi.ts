import { api } from '../lib/api';
import type { CreateSaleDto, SaleDetail, SaleSummary } from '../types/sale';

export const salesApi = {
  create: (dto: CreateSaleDto) =>
    api.post<SaleDetail>('/api/sales', dto).then(r => r.data),
  list: (storeId?: string | null) =>
    api.get<SaleSummary[]>('/api/sales', {
      params: storeId ? { storeId } : {},
    }).then(r => r.data),
  get: (id: string) =>
    api.get<SaleDetail>(`/api/sales/${id}`).then(r => r.data),
};
