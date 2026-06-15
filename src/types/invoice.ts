// ── Invoices ──────────────────────────────────────────────────────────────────

export interface InvoiceSummary {
  id: string;
  number: string;
  storeId: string;
  storeName: string;
  customerId: string | null;
  customerName: string | null;
  saleId: string | null;
  total: number;
  status: 'issued' | 'cancelled';
  createdAt: string;
}

export interface InvoiceItemDetail {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface InvoiceDetail extends InvoiceSummary {
  notes: string | null;
  items: InvoiceItemDetail[];
}

export interface CreateInvoiceItemDto {
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceDto {
  storeId: string;
  saleId?: string | null;
  customerId?: string | null;
  notes?: string | null;
  items?: CreateInvoiceItemDto[];
}

// ── Proformas ──────────────────────────────────────────────────────────────────

export type ProformaStatus = 'draft' | 'sent' | 'accepted' | 'converted' | 'cancelled';

export interface ProformaSummary {
  id: string;
  number: string;
  storeId: string;
  storeName: string;
  locationId: string;
  locationName: string;
  customerId: string | null;
  customerName: string | null;
  kind: 'retail' | 'wholesale';
  credit: boolean;
  total: number;
  status: ProformaStatus;
  createdAt: string;
  convertedSaleId: string | null;
}

export interface ProformaItemDetail {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ProformaDetail extends ProformaSummary {
  notes: string | null;
  convertedInvoiceId: string | null;
  items: ProformaItemDetail[];
}

export interface ProformaItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateProformaDto {
  storeId: string;
  locationId: string;
  customerId?: string | null;
  kind: 'retail' | 'wholesale';
  credit: boolean;
  notes?: string | null;
  items: ProformaItemDto[];
}

export interface UpdateProformaDto {
  locationId: string;
  customerId?: string | null;
  kind: 'retail' | 'wholesale';
  credit: boolean;
  notes?: string | null;
  items: ProformaItemDto[];
}

export interface UpdateProformaStatusDto {
  status: string;
}

export interface ConvertProformaDto {
  generateInvoice: boolean;
}

export interface ConvertProformaResponse {
  proformaId: string;
  proformaNumber: string;
  saleId: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
}
