import { api } from './api';

/** params: { page, pageSize, busca, anoLetivo, turno, ativo } → { items, pagination } */
export async function listTurmas(params, { signal } = {}) {
  const { data } = await api.get('/turmas', { params, signal });
  return data.data;
}

/** Turma com `alunos` (matrículas ativas) e `professores` (atribuições). */
export async function getTurma(id, { signal } = {}) {
  const { data } = await api.get(`/turmas/${id}`, { signal });
  return data.data.turma;
}

export async function createTurma(payload) {
  const { data } = await api.post('/turmas', payload);
  return data.data.turma;
}

export async function updateTurma(id, payload) {
  const { data } = await api.put(`/turmas/${id}`, payload);
  return data.data.turma;
}

export async function setTurmaAtivo(id, ativo) {
  const { data } = await api.patch(`/turmas/${id}/ativo`, { ativo });
  return data.data.turma;
}

/** → { alunos, transferidoDe }. Com 409 e campo "transferir", repetir com transferir: true. */
export async function matricularAluno(turmaId, alunoId, { transferir = false } = {}) {
  const { data } = await api.post(`/turmas/${turmaId}/alunos`, { alunoId, transferir });
  return data.data;
}

export async function removerAluno(turmaId, alunoId) {
  await api.delete(`/turmas/${turmaId}/alunos/${alunoId}`);
}

export async function listProfessores(turmaId) {
  const { data } = await api.get(`/turmas/${turmaId}/professores`);
  return data.data.professores;
}

export async function atribuirProfessor(turmaId, payload) {
  const { data } = await api.post(`/turmas/${turmaId}/professores`, payload);
  return data.data.atribuicao;
}

export async function removerAtribuicao(turmaId, atribuicaoId) {
  await api.delete(`/turmas/${turmaId}/professores/${atribuicaoId}`);
}
