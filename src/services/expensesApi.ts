import { api } from '../lib/api';
import type { Expense, CreateExpenseDto } from '../types/expense';

export interface ExpenseFilters {
  storeId?: string;
  from?: string;   // "YYYY-MM-DD"
  to?: string;     // "YYYY-MM-DD"
}

export const expensesApi = {
  list: (filters?: ExpenseFilters) =>
    api.get<Expense[]>('/api/expenses', { params: filters }).then(r => r.data),
  create: (dto: CreateExpenseDto) =>
    api.post<Expense>('/api/expenses', dto).then(r => r.data),
};
