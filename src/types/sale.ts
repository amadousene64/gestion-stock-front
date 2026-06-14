export interface CreateSaleDto {
  storeId: string;
  locationId: string;
  customerId?: string;
  kind: 'retail' | 'wholesale';
  credit: boolean;
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

export interface SaleDetail {
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
  items: SaleItemDetail[];
}

export interface CartItem {
  productId: string;
  productName: string;
  unitCode: string;
  allowDecimal: boolean;
  quantity: number;
  unitPrice: number;
}
