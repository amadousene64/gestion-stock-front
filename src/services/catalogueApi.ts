import { api } from '../lib/api';
import type { Product, ProductDto, Category, CategoryDto, Unit, UnitDto } from '../types/catalogue';

export const productsApi = {
  list:   ()                              => api.get<Product[]>('/api/products').then(r => r.data),
  create: (dto: ProductDto)               => api.post<Product>('/api/products', dto).then(r => r.data),
  update: (id: string, dto: ProductDto)   => api.put<Product>(`/api/products/${id}`, dto).then(r => r.data),
  remove: (id: string)                    => api.delete(`/api/products/${id}`),
};

export const categoriesApi = {
  list:   ()                               => api.get<Category[]>('/api/categories').then(r => r.data),
  create: (dto: CategoryDto)               => api.post<Category>('/api/categories', dto).then(r => r.data),
  update: (id: string, dto: CategoryDto)   => api.put<Category>(`/api/categories/${id}`, dto).then(r => r.data),
};

export const unitsApi = {
  list:   ()                           => api.get<Unit[]>('/api/units').then(r => r.data),
  create: (dto: UnitDto)               => api.post<Unit>('/api/units', dto).then(r => r.data),
  update: (id: string, dto: UnitDto)   => api.put<Unit>(`/api/units/${id}`, dto).then(r => r.data),
};
