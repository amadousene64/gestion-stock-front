import { api } from '../lib/api';

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type Params = Record<string, string | undefined>;

async function fetchBlob(path: string, params?: Params): Promise<Blob> {
  const clean = params
    ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    : undefined;
  const resp = await api.get(path, { responseType: 'blob', params: clean });
  return resp.data as Blob;
}

export const exportApi = {
  products: () =>
    fetchBlob('/api/export/products').then(b => triggerDownload(b, 'produits.xlsx')),

  customers: () =>
    fetchBlob('/api/export/customers').then(b => triggerDownload(b, 'clients.xlsx')),

  stock: (storeId?: string | null) =>
    fetchBlob('/api/export/stock', storeId ? { storeId } : undefined)
      .then(b => triggerDownload(b, 'stock.xlsx')),

  sales: (p: {
    storeId?: string;
    dateFrom?: string;
    dateTo?: string;
    paymentMode?: string;
    clientSearch?: string;
  }) =>
    fetchBlob('/api/export/sales', {
      storeId:      p.storeId      || undefined,
      dateFrom:     p.dateFrom     || undefined,
      dateTo:       p.dateTo       || undefined,
      paymentMode:  p.paymentMode !== 'all' ? p.paymentMode : undefined,
      clientSearch: p.clientSearch || undefined,
    }).then(b => triggerDownload(b, 'ventes.xlsx')),
};
