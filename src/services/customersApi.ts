import axios from 'axios';
import { api } from '../lib/api';
import type { Customer, CustomerDetail, LedgerEntry, PortalData, PortalLinkResponse } from '../types/customer';

export const customersApi = {
  list:      () => api.get<Customer[]>('/api/customers').then(r => r.data),
  search:    (q: string) => api.get<Customer[]>('/api/customers', { params: { q } }).then(r => r.data),
  getDetail: (id: string) => api.get<CustomerDetail>(`/api/customers/${id}`).then(r => r.data),
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

  payment: (id: string, dto: { amount: number; paymentMethod: string; referenceType?: string | null }) =>
    api.post<LedgerEntry>(`/api/customers/${id}/ledger/payment`, dto).then(r => r.data),

  deposit: (id: string, dto: { amount: number; paymentMethod: string; referenceType?: string | null }) =>
    api.post<LedgerEntry>(`/api/customers/${id}/ledger/deposit`, dto).then(r => r.data),

  generatePortalLink: (id: string) =>
    api.post<PortalLinkResponse>(`/api/customers/${id}/portal-link`).then(r => r.data),

  revokePortalLink: (id: string) =>
    api.delete(`/api/customers/${id}/portal-link`),

  getReceiptPdf: (customerId: string, entryId: string) =>
    api.get(`/api/customers/${customerId}/ledger/${entryId}/receipt/pdf`, {
      responseType: 'blob',
    }).then(r => r.data as Blob),
};

// Instance publique sans intercepteur JWT (évite la redirection /login sur 404)
const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL });

export const portalApi = {
  getData: (token: string) =>
    publicApi.get<PortalData>(`/api/portal/${token}`).then(r => r.data),

  // ── Factures ────────────────────────────────────────────────────────────────

  getInvoiceDetail: (token: string, invoiceId: string) =>
    publicApi.get<import('../types/invoice').InvoiceDetail>(
      `/api/portal/${token}/invoices/${invoiceId}`
    ).then(r => r.data),

  getInvoicePdf: (token: string, invoiceId: string) =>
    publicApi.get(`/api/portal/${token}/invoices/${invoiceId}/pdf`, { responseType: 'blob' })
      .then(r => r.data as Blob),

  // ── Versements / acomptes ────────────────────────────────────────────────────

  getPaymentDetail: (token: string, paymentId: string) =>
    publicApi.get<import('../types/customer').LedgerEntry>(
      `/api/portal/${token}/payments/${paymentId}`
    ).then(r => r.data),

  getReceiptPdf: (token: string, paymentId: string) =>
    publicApi.get(`/api/portal/${token}/payments/${paymentId}/receipt/pdf`, { responseType: 'blob' })
      .then(r => r.data as Blob),
};
