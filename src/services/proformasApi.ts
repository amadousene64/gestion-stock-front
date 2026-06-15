import { api } from '../lib/api';
import type {
  ProformaSummary, ProformaDetail,
  CreateProformaDto, UpdateProformaDto,
  UpdateProformaStatusDto, ConvertProformaDto, ConvertProformaResponse,
} from '../types/invoice';

export const proformasApi = {
  list:   ()           => api.get<ProformaSummary[]>('/api/proformas').then(r => r.data),
  get:    (id: string) => api.get<ProformaDetail>(`/api/proformas/${id}`).then(r => r.data),
  create: (dto: CreateProformaDto) => api.post<ProformaDetail>('/api/proformas', dto).then(r => r.data),
  update: (id: string, dto: UpdateProformaDto) =>
    api.put<ProformaDetail>(`/api/proformas/${id}`, dto).then(r => r.data),
  updateStatus: (id: string, dto: UpdateProformaStatusDto) =>
    api.patch<ProformaDetail>(`/api/proformas/${id}/status`, dto).then(r => r.data),
  convert: (id: string, dto: ConvertProformaDto) =>
    api.post<ConvertProformaResponse>(`/api/proformas/${id}/convert`, dto).then(r => r.data),
  getPdfBlob: (id: string) =>
    api.get(`/api/proformas/${id}/pdf`, { responseType: 'blob' }).then(r => r.data as Blob),
};
