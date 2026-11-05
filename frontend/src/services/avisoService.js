import { api } from './api';

// ---------- Gestão (ADMIN e PROFESSOR) ----------

/** params: { page, pageSize, busca, publico, ativo } → { items, pagination } */
export async function listAvisos(params, { signal } = {}) {
  const { data } = await api.get('/avisos', { params, signal });
  return data.data;
}

/** Aviso com `destinatarios` (quem deve ler e quem já leu). */
export async function getAviso(id, { signal } = {}) {
  const { data } = await api.get(`/avisos/${id}`, { signal });
  return data.data.aviso;
}

/** payload: { titulo, conteudo, publico, turmaId?, alunoId? } → { aviso, message } */
export async function createAviso(payload) {
  const { data } = await api.post('/avisos', payload);
  return { aviso: data.data.aviso, message: data.message };
}

export async function setAvisoAtivo(id, ativo) {
  const { data } = await api.patch(`/avisos/${id}/ativo`, { ativo });
  return data.data.aviso;
}

// ---------- Usuário logado ----------

/** Responsável: params { page, pageSize, naoLidos } → { items, pagination } */
export async function listMeusAvisos(params, { signal } = {}) {
  const { data } = await api.get('/me/avisos', { params, signal });
  return data.data;
}

export async function getMeuAviso(id, { signal } = {}) {
  const { data } = await api.get(`/me/avisos/${id}`, { signal });
  return data.data.aviso;
}

export async function marcarAvisoComoLido(id) {
  const { data } = await api.post(`/me/avisos/${id}/visualizar`);
  return data.data;
}

/** Professor: turmas em que leciona (para escolher o público do aviso). */
export async function listMinhasTurmas({ signal } = {}) {
  const { data } = await api.get('/me/turmas', { signal });
  return data.data.turmas;
}
