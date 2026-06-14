import { api } from '../lib/api';

export interface UserProfile {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
}

export interface UpdateProfileDto {
  fullName: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export const userApi = {
  getMe:          ()                          => api.get<UserProfile>('/api/users/me').then(r => r.data),
  updateMe:       (dto: UpdateProfileDto)     => api.put<UserProfile>('/api/users/me', dto).then(r => r.data),
  changePassword: (dto: ChangePasswordDto)    => api.put('/api/users/me/password', dto),
};
