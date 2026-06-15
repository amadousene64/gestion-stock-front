export interface Expense {
  id: string;
  storeId: string;
  storeName: string;
  amount: number;
  reason: string;
  expenseDate: string;   // "YYYY-MM-DD" (LocalDate from backend)
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface CreateExpenseDto {
  storeId: string;
  amount: number;
  reason: string;
  expenseDate: string;   // "YYYY-MM-DD"
}
