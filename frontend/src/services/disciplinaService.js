import { api } from './api';

/** params: { page, pageSize, busca, ativo } → { items, pagination } */
export async function listDisciplinas(params, { signal } = {}) {
  const { data } = await api.get('/disciplinas', { params, signal });
  return data.data;
}

export async function getDisciplina(id, { signal } = {}) {
  const { data } = await api.get(`/disciplinas/${id}`, { signal });
  return data.data.disciplina;
}

export async function createDisciplina(payload) {
  const { data } = await api.post('/disciplinas', payload);
  return data.data.disciplina;
}

export async function updateDisciplina(id, payload) {
  const { data } = await api.put(`/disciplinas/${id}`, payload);
  return data.data.disciplina;
}

export async function setDisciplinaAtivo(id, ativo) {
  const { data } = await api.patch(`/disciplinas/${id}/ativo`, { ativo });
  return data.data.disciplina;
}
