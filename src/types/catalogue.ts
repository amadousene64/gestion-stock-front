export interface Unit {
  id: string;
  code: string;
  label: string;
  allowDecimal: boolean;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string | null;
  unitId: string;
  salePrice: number;
  sku: string | null;
  active: boolean;
}

export type UnitDto     = Omit<Unit, 'id'>;
export type CategoryDto = Omit<Category, 'id'>;
export type ProductDto  = Omit<Product, 'id'>;
