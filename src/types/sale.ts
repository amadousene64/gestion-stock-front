export interface CreateSaleDto {
  storeId: string;
  locationId: string;
  customerId?: string;
  kind: 'retail' | 'wholesale';
  credit: boolean;
  paymentMethod?: 'cash' | 'orange_money' | 'wave';
  items: SaleItemDto[];
}

export interface SaleItemDto {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface SaleItemDetail {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SaleSummary {
  id: string;
  storeId: string;
  storeName: string;
  locationId: string;
  locationName: string;
  customerId: string | null;
  customerName: string | null;
  kind: string;
  total: number;
  credit: boolean;
  createdAt: string;
}

export interface SaleDetail extends SaleSummary {
  items: SaleItemDetail[];
  paymentMethod?: 'cash' | 'orange_money' | 'wave' | null;
}

export interface CartItem {
  productId: string;
  productName: string;
  unitCode: string;
  allowDecimal: boolean;
  quantity: number;
  unitPrice: number;
}
