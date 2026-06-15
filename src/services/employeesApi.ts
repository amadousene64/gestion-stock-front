import { api } from '../lib/api';
import type { Employee, CreateEmployeeDto, UpdateEmployeeDto } from '../types/employee';

export const employeesApi = {
  list:       ()                                 => api.get<Employee[]>('/api/employees').then(r => r.data),
  get:        (id: string)                       => api.get<Employee>(`/api/employees/${id}`).then(r => r.data),
  create:     (dto: CreateEmployeeDto)           => api.post<Employee>('/api/employees', dto).then(r => r.data),
  update:     (id: string, dto: UpdateEmployeeDto) => api.put<Employee>(`/api/employees/${id}`, dto).then(r => r.data),
  deactivate: (id: string)                       => api.delete(`/api/employees/${id}`),
  addToStore:      (storeId: string, userId: string) =>
    api.post(`/api/stores/${storeId}/members`, { userId }),
  removeFromStore: (storeId: string, userId: string) =>
    api.delete(`/api/stores/${storeId}/members/${userId}`),
};
