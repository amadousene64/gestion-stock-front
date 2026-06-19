export interface LoginDto {
  identifier: string;
  password: string;
}

export interface RegisterDto {
  commerceName: string;
  fullName: string;
  email?: string;
  phone?: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  tenantId: string | null;
  role: string;
  fullName: string;
  email?: string;
  phone?: string;
}

export interface AuthUser {
  userId: string;
  tenantId: string | null;
  role: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.role === 'super_admin';
}
