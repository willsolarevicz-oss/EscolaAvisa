import { ROLES } from '../config/roles.js';
import { listMeusAvisos } from './avisoService.js';
import { listConversas } from './conversaService.js';
import { listMinhasOcorrencias } from './ocorrenciaService.js';

// pageSize 1: só precisamos do total que vem na paginação (mesma regra das listas, sem SQL duplicado).
const SO_TOTAL = { page: 1, pageSize: 1 };

/**
 * Números da sidebar/dashboard do usuário logado, numa chamada só:
 * - todos: conversas com mensagem nova;
 * - RESPONSAVEL: também avisos não lidos e ocorrências aguardando ciência.
 */
export async function getContadores(user) {
  const conversas = listConversas(user, { ...SO_TOTAL, naoLidas: true });
  if (user.tipo_usuario !== ROLES.RESPONSAVEL) {
    return { mensagensNaoLidas: (await conversas).pagination.total };
  }

  const [mensagens, avisos, ocorrencias] = await Promise.all([
    conversas,
    listMeusAvisos(user, { ...SO_TOTAL, naoLidos: true }),
    listMinhasOcorrencias(user, { ...SO_TOTAL, pendentes: true }),
  ]);
  return {
    mensagensNaoLidas: mensagens.pagination.total,
    avisosNaoLidos: avisos.pagination.total,
    ocorrenciasPendentes: ocorrencias.pagination.total,
  };
}
