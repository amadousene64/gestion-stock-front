export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  createdAt: string;
}

export interface PortalLinkResponse {
  url: string;
}

export interface CustomerDetail extends Customer {
  balance: number;
  hasPortalLink: boolean;
}

export interface LedgerEntry {
  id: string;
  customerId: string;
  amount: number;
  type: string;
  referenceType: string | null;
  referenceId: string | null;
  createdById: string | null;
  createdAt: string;
  receiptNumber?: string | null;
  paymentMethod?: string | null;
}

export interface InvoiceSummary {
  id: string;
  number: string;
  storeId: string;
  storeName: string;
  customerId: string | null;
  customerName: string | null;
  saleId: string | null;
  total: number;
  status: string;
  createdAt: string;
}

export interface PortalData {
  tenantName: string;
  logoDataUri: string | null;
  customerName: string;
  phone: string | null;
  balance: number;
  ledger: LedgerEntry[];
  invoices: InvoiceSummary[];
}
