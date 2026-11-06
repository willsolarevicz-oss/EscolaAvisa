import { api } from './api';

/** params: { page, pageSize, busca, falhas } → { items, pagination } (só ADMIN). */
export async function listAuditoria(params, { signal } = {}) {
  const { data } = await api.get('/auditoria', { params, signal });
  return data.data;
}
