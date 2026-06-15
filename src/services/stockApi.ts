import { api } from '../lib/api';

export interface StockPosition {
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  quantity: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  quantity: number;
  type: string;
  referenceType: string | null;
  referenceId: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface SupplyDto {
  productId: string;
  locationId: string;
  quantity: number;
  referenceType?: string;
}

export interface AdjustmentDto {
  productId: string;
  locationId: string;
  quantity: number; // signé
  referenceType?: string;
}

export interface InventoryDto {
  productId: string;
  locationId: string;
  targetQuantity: number; // >= 0
}

export interface TransferDto {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
}

export const stockApi = {
  getPositions:  ()                          => api.get<StockPosition[]>('/api/stock').then(r => r.data),
  getMovements:  ()                          => api.get<StockMovement[]>('/api/stock/movements').then(r => r.data),
  getMovementsByProduct: (productId: string) =>
    api.get<StockMovement[]>(`/api/stock/movements/product/${productId}`).then(r => r.data),

  supply:     (dto: SupplyDto)     => api.post<StockMovement>('/api/stock/supply', dto).then(r => r.data),
  adjust:     (dto: AdjustmentDto) => api.post<StockMovement>('/api/stock/adjustment', dto).then(r => r.data),
  inventory:  (dto: InventoryDto)  => api.post<StockMovement>('/api/stock/inventory', dto).then(r => r.data),
  transfer:   (dto: TransferDto)   => api.post<StockMovement[]>('/api/stock/transfer', dto).then(r => r.data),
};
