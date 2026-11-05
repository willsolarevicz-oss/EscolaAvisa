import { api } from './api';

// ---------- Gestão (ADMIN e PROFESSOR) ----------

/** params: { page, pageSize, busca, tipo, ativo, alunoId } → { items, pagination } */
export async function listOcorrencias(params, { signal } = {}) {
  const { data } = await api.get('/ocorrencias', { params, signal });
  return data.data;
}

/** Ocorrência com `ciencias` (quem deve dar ciência e quem já deu). */
export async function getOcorrencia(id, { signal } = {}) {
  const { data } = await api.get(`/ocorrencias/${id}`, { signal });
  return data.data.ocorrencia;
}

/** payload: { alunoId, tipo, descricao, dataOcorrencia } → { ocorrencia, message } */
export async function createOcorrencia(payload) {
  const { data } = await api.post('/ocorrencias', payload);
  return { ocorrencia: data.data.ocorrencia, message: data.message };
}

export async function setOcorrenciaAtivo(id, ativo) {
  const { data } = await api.patch(`/ocorrencias/${id}/ativo`, { ativo });
  return data.data.ocorrencia;
}

// ---------- Usuário logado ----------

/** Responsável: params { page, pageSize, pendentes } → { items, pagination } */
export async function listMinhasOcorrencias(params, { signal } = {}) {
  const { data } = await api.get('/me/ocorrencias', { params, signal });
  return data.data;
}

export async function getMinhaOcorrencia(id, { signal } = {}) {
  const { data } = await api.get(`/me/ocorrencias/${id}`, { signal });
  return data.data.ocorrencia;
}

export async function registrarCiencia(id) {
  const { data } = await api.post(`/me/ocorrencias/${id}/ciencia`);
  return data.data;
}

/** Professor: alunos das turmas em que leciona (para registrar ocorrência). */
export async function listMeusAlunos(busca, { signal } = {}) {
  const { data } = await api.get('/me/alunos', { params: { busca }, signal });
  return data.data.alunos;
}
