import { api } from '../lib/api';

function _triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export interface ImportRowPreview {
  rowNumber: number;
  name: string;
  categoryName: string;
  unitCode: string;
  salePrice: number | null;
  sku: string;
  status: 'valid' | 'error';
  errors: string[];
}

export interface ImportPreviewResponse {
  validCount: number;
  errorCount: number;
  rows: ImportRowPreview[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
}

async function downloadTemplate(): Promise<void> {
  const res = await api.get('/api/import/products/template', { responseType: 'blob' });
  _triggerDownload(res.data as Blob, 'modele_import_produits.xlsx');
}

async function preview(file: File): Promise<ImportPreviewResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<ImportPreviewResponse>('/api/import/products/preview', form);
  return res.data;
}

async function confirm(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<ImportResult>('/api/import/products/confirm', form);
  return res.data;
}

// ── Customers ─────────────────────────────────────────────────────────────────

export interface CustomerImportRow {
  rowNumber: number;
  name: string;
  phone: string;
  status: 'valid' | 'error';
  errors: string[];
}

export interface CustomerImportPreview {
  validCount: number;
  errorCount: number;
  rows: CustomerImportRow[];
}

async function downloadCustomerTemplate(): Promise<void> {
  const res = await api.get('/api/import/customers/template', { responseType: 'blob' });
  _triggerDownload(res.data as Blob, 'modele_import_clients.xlsx');
}

async function previewCustomers(file: File): Promise<CustomerImportPreview> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<CustomerImportPreview>('/api/import/customers/preview', form);
  return res.data;
}

async function confirmCustomers(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<ImportResult>('/api/import/customers/confirm', form);
  return res.data;
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export interface StockImportRow {
  rowNumber: number;
  productIdentifier: string;
  resolvedProductName: string | null;
  locationName: string;
  quantity: number | null;
  status: 'valid' | 'error';
  errors: string[];
}

export interface StockImportPreview {
  validCount: number;
  errorCount: number;
  rows: StockImportRow[];
}

async function downloadStockTemplate(storeId?: string | null): Promise<void> {
  const params = storeId ? { storeId } : {};
  const res = await api.get('/api/import/stock/template', { responseType: 'blob', params });
  _triggerDownload(res.data as Blob, 'modele_import_stock.xlsx');
}

async function previewStock(file: File, storeId?: string | null): Promise<StockImportPreview> {
  const form = new FormData();
  form.append('file', file);
  const params = storeId ? { storeId } : {};
  const res = await api.post<StockImportPreview>('/api/import/stock/preview', form, { params });
  return res.data;
}

async function confirmStock(file: File, storeId?: string | null): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const params = storeId ? { storeId } : {};
  const res = await api.post<ImportResult>('/api/import/stock/confirm', form, { params });
  return res.data;
}

export const importApi = {
  // Produits
  downloadTemplate, preview, confirm,
  // Clients
  downloadCustomerTemplate, previewCustomers, confirmCustomers,
  // Stock
  downloadStockTemplate, previewStock, confirmStock,
};
