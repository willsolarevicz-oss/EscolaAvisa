import { api } from './api';

/** params: { page, pageSize, naoLidas } → { items, pagination } */
export async function listConversas(params, { signal } = {}) {
  const { data } = await api.get('/conversas', { params, signal });
  return data.data;
}

/**
 * Opções para "nova conversa".
 * Responsável (sem alunoId): { alunos: [{ id, nome, professores: [{ id, nome, disciplinas }] }] }
 * Escola (com alunoId): { responsaveis: [{ id, nome, parentesco, principal }] }
 */
export async function getContatos(alunoId, { signal } = {}) {
  const { data } = await api.get('/conversas/contatos', { params: alunoId ? { alunoId } : {}, signal });
  return data.data;
}

/** Conversa com `mensagens` (em ordem de envio). */
export async function getConversa(id, { signal } = {}) {
  const { data } = await api.get(`/conversas/${id}`, { signal });
  return data.data.conversa;
}

/** payload: { alunoId, assunto, mensagem, canal?, professorId?, responsavelId? } → conversa */
export async function iniciarConversa(payload) {
  const { data } = await api.post('/conversas', payload);
  return data.data.conversa;
}

/** Envia e devolve a conversa atualizada. */
export async function enviarMensagem(id, conteudo) {
  const { data } = await api.post(`/conversas/${id}/mensagens`, { conteudo });
  return data.data.conversa;
}

export async function marcarConversaLida(id) {
  await api.post(`/conversas/${id}/lida`);
}
