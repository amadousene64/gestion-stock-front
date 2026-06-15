export interface Employee {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  storeIds: string[];
}

export interface CreateEmployeeDto {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  password: string;
}

export interface UpdateEmployeeDto {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  active: boolean;
}
