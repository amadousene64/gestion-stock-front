export interface Location {
  id: string;
  name: string;
  type: string;
  storeId: string | null; // null pour les entrepôts communs (shared_warehouse)
  createdAt: string;
}
