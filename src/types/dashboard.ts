export interface SalesToday {
  count: number;
  revenue: number;     // CA total (comptant + crédit)
  cashRevenue: number; // ventes comptant uniquement
}

export interface StockAlertItem {
  productId: string;
  productName: string;
  totalQuantity: number;
  alertLevel: 'out_of_stock' | 'low_stock';
}

export interface StockAlerts {
  outOfStock: number;
  lowStock: number;
  items: StockAlertItem[];
}

export interface RecentSale {
  id: string;
  storeName: string;
  customerName: string | null;
  total: number;
  credit: boolean;
  createdAt: string;
}

export interface PaymentBreakdown {
  cash: number;
  orangeMoney: number;
  wave: number;
}

export interface DashboardSummary {
  salesToday: SalesToday;
  activeCustomers: number;
  stockAlerts: StockAlerts;
  recentSales: RecentSale[];
  totalOutstandingCredit: number;
  collectedToday?: number; // encaissé réel = comptant + versements + acomptes
  paymentBreakdown?: PaymentBreakdown;
}
