import { api } from '../lib/api';
import type { CreateSaleDto, SaleDetail } from '../types/sale';

export const salesApi = {
  create: (dto: CreateSaleDto) =>
    api.post<SaleDetail>('/api/sales', dto).then(r => r.data),
  list: () =>
    api.get<SaleDetail[]>('/api/sales').then(r => r.data),
};
