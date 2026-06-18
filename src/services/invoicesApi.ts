import { api } from '../lib/api';
import type { InvoiceSummary, InvoiceDetail, CreateInvoiceDto } from '../types/invoice';

export const invoicesApi = {
  list:   ()           => api.get<InvoiceSummary[]>('/api/invoices').then(r => r.data),
  get:    (id: string) => api.get<InvoiceDetail>(`/api/invoices/${id}`).then(r => r.data),
  getBySaleId: (saleId: string) =>
    api.get<InvoiceSummary>(`/api/invoices/by-sale/${saleId}`).then(r => r.data),
  create: (dto: CreateInvoiceDto) => api.post<InvoiceDetail>('/api/invoices', dto).then(r => r.data),
  cancel: (id: string) => api.patch<InvoiceDetail>(`/api/invoices/${id}/cancel`).then(r => r.data),
  getPdfBlob: (id: string) =>
    api.get(`/api/invoices/${id}/pdf`, { responseType: 'blob' }).then(r => r.data as Blob),
};
