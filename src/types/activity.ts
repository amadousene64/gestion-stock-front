export type ActivityType = 'sale' | 'expense' | 'stock_in' | 'stock_out';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  occurredAt: string;          // ISO instant
  storeId: string | null;
  storeName: string;
  authorId: string | null;
  authorName: string | null;
  amount: number | null;       // vente / dépense
  quantity: number | null;     // mouvement de stock
  label: string;
}

export interface ActivityPage {
  items: ActivityItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
