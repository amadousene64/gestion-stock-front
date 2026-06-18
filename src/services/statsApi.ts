import { api } from '../lib/api';

export type Period = '7d' | '30d' | 'month';

export interface DailySales {
  date: string;
  revenue: number;
  count: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface PaymentSplit {
  mode: 'comptant' | 'credit';
  revenue: number;
  count: number;
}

export interface StoreRevenue {
  storeId: string;
  storeName: string;
  revenue: number;
  count: number;
}

export interface CashflowDay {
  date: string;
  revenue: number;   // recettes comptant
  expenses: number;  // dépenses
  balance: number;   // revenue - expenses
}

export interface TopDebtor {
  customerId: string;
  customerName: string;
  debt: number;
}

interface StatsParams {
  period: Period;
  storeId?: string | null;
}

function buildParams({ period, storeId }: StatsParams) {
  return { period, ...(storeId ? { storeId } : {}) };
}

export const statsApi = {
  getSalesByDay: (p: StatsParams) =>
    api.get<DailySales[]>('/api/stats/sales-by-day', { params: buildParams(p) }).then(r => r.data),

  getTopProducts: (p: StatsParams) =>
    api.get<TopProduct[]>('/api/stats/top-products', { params: buildParams(p) }).then(r => r.data),

  getPaymentSplit: (p: StatsParams) =>
    api.get<PaymentSplit[]>('/api/stats/payment-split', { params: buildParams(p) }).then(r => r.data),

  getRevenueByStore: (period: Period) =>
    api.get<StoreRevenue[]>('/api/stats/revenue-by-store', { params: { period } }).then(r => r.data),

  getCashflow: (p: StatsParams) =>
    api.get<CashflowDay[]>('/api/stats/cashflow', { params: buildParams(p) }).then(r => r.data),

  getTopDebtors: () =>
    api.get<TopDebtor[]>('/api/stats/top-debtors').then(r => r.data),
};
