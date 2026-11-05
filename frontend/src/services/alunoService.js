import { api } from './api';

/** params: { page, pageSize, busca, ativo } → { items, pagination } */
export async function listAlunos(params, { signal } = {}) {
  const { data } = await api.get('/alunos', { params, signal });
  return data.data;
}

/** Aluno com `responsaveis` (vínculos) incluídos. */
export async function getAluno(id, { signal } = {}) {
  const { data } = await api.get(`/alunos/${id}`, { signal });
  return data.data.aluno;
}

export async function createAluno(payload) {
  const { data } = await api.post('/alunos', payload);
  return data.data.aluno;
}

export async function updateAluno(id, payload) {
  const { data } = await api.put(`/alunos/${id}`, payload);
  return data.data.aluno;
}

export async function setAlunoAtivo(id, ativo) {
  const { data } = await api.patch(`/alunos/${id}/ativo`, { ativo });
  return data.data.aluno;
}

export async function listVinculos(alunoId) {
  const { data } = await api.get(`/alunos/${alunoId}/responsaveis`);
  return data.data.responsaveis;
}

/** payload: { usuarioId, parentesco, responsavelPrincipal, autorizadoReceberComunicacoes } */
export async function createVinculo(alunoId, payload) {
  const { data } = await api.post(`/alunos/${alunoId}/responsaveis`, payload);
  return data.data.vinculo;
}

export async function updateVinculo(alunoId, vinculoId, payload) {
  const { data } = await api.put(`/alunos/${alunoId}/responsaveis/${vinculoId}`, payload);
  return data.data.vinculo;
}

export async function removeVinculo(alunoId, vinculoId) {
  await api.delete(`/alunos/${alunoId}/responsaveis/${vinculoId}`);
}
