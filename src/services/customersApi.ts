import axios from 'axios';
import { api } from '../lib/api';
import type { Customer, LedgerEntry, PortalData, PortalLinkResponse } from '../types/customer';

export const customersApi = {
  list:   () => api.get<Customer[]>('/api/customers').then(r => r.data),
  get:    (id: string) => api.get<Customer>(`/api/customers/${id}`).then(r => r.data),
  create: (dto: { name: string; phone?: string | null }) =>
    api.post<Customer>('/api/customers', dto).then(r => r.data),
  update: (id: string, dto: { name: string; phone?: string | null }) =>
    api.put<Customer>(`/api/customers/${id}`, dto).then(r => r.data),
  delete: (id: string) => api.delete(`/api/customers/${id}`),

  getBalance: (id: string) =>
    api.get<{ customerId: string; customerName: string; balance: number }>(
      `/api/customers/${id}/balance`
    ).then(r => r.data),

  getLedger: (id: string) =>
    api.get<LedgerEntry[]>(`/api/customers/${id}/ledger`).then(r => r.data),

  generatePortalLink: (id: string) =>
    api.post<PortalLinkResponse>(`/api/customers/${id}/portal-link`).then(r => r.data),

  revokePortalLink: (id: string) =>
    api.delete(`/api/customers/${id}/portal-link`),
};

// Instance publique sans intercepteur JWT (évite la redirection /login sur 404)
const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export const portalApi = {
  getData: (token: string) =>
    publicApi.get<PortalData>(`/api/portal/${token}`).then(r => r.data),
};
