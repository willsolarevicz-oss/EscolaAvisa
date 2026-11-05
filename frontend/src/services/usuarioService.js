import { api } from './api';

/** params: { page, pageSize, busca, tipo, ativo } → { items, pagination } */
export async function listUsuarios(params, { signal } = {}) {
  const { data } = await api.get('/usuarios', { params, signal });
  return data.data;
}

export async function getUsuario(id, { signal } = {}) {
  const { data } = await api.get(`/usuarios/${id}`, { signal });
  return data.data.user;
}

export async function createUsuario(payload) {
  const { data } = await api.post('/usuarios', payload);
  return data.data.user;
}

export async function updateUsuario(id, payload) {
  const { data } = await api.put(`/usuarios/${id}`, payload);
  return data.data.user;
}

export async function setUsuarioAtivo(id, ativo) {
  const { data } = await api.patch(`/usuarios/${id}/ativo`, { ativo });
  return data.data.user;
}

export async function resetUsuarioSenha(id, senha) {
  await api.patch(`/usuarios/${id}/senha`, { senha });
}
