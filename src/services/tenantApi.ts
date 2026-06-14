import { api } from '../lib/api';
import type { Tenant } from '../types/tenant';

export const tenantApi = {
  getCurrent: () =>
    api.get<Tenant>('/api/tenant').then(r => r.data),

  update: (dto: { name: string; currency: string }) =>
    api.put<Tenant>('/api/tenant', dto).then(r => r.data),

  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<Tenant>('/api/tenant/logo', form).then(r => r.data);
  },
};
