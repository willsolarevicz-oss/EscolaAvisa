import { api } from './api';

/** mes: 'AAAA-MM' → { mes, eventos, feriados: [{ data, nome }], feriadosDisponiveis } */
export async function getCalendario(mes, { signal } = {}) {
  const { data } = await api.get('/calendario', { params: { mes }, signal });
  return data.data;
}

export async function getEvento(id, { signal } = {}) {
  const { data } = await api.get(`/eventos/${id}`, { signal });
  return data.data.evento;
}

/** payload: { titulo, descricao, tipo, dataInicio, dataFim, turmaId } */
export async function createEvento(payload) {
  const { data } = await api.post('/eventos', payload);
  return { evento: data.data.evento, message: data.message };
}

export async function updateEvento(id, payload) {
  const { data } = await api.put(`/eventos/${id}`, payload);
  return { evento: data.data.evento, message: data.message };
}

export async function deleteEvento(id) {
  const { data } = await api.delete(`/eventos/${id}`);
  return data.message;
}
