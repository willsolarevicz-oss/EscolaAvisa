import { api } from './api';

/**
 * Números da sidebar do usuário logado:
 * { mensagensNaoLidas, avisosNaoLidos?, ocorrenciasPendentes? } (os dois últimos só para responsável).
 */
export async function getContadores({ signal } = {}) {
  const { data } = await api.get('/me/contadores', { signal });
  return data.data;
}

export const CONTADORES_EVENT = 'escolaavis:contadores';

/**
 * Avisa a sidebar que algo foi lido/respondido (ex.: abriu uma conversa) para ela
 * atualizar os números na hora, sem esperar a próxima navegação.
 */
export function notificarMudancaContadores() {
  window.dispatchEvent(new Event(CONTADORES_EVENT));
}
