import { env } from '../config/env.js';
import { withTransaction } from '../database/transaction.js';
import * as retencaoRepository from '../repositories/retencaoRepository.js';

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Prazos da Política de Privacidade que dá para aplicar automaticamente.
 * Hoje só a trilha de auditoria: os prazos de histórico escolar e comunicações
 * ainda dependem da escola/jurídico ([PREENCHER] na Política) e NÃO são apagados.
 */
export async function planejarLimpeza({ dias = env.auditoriaRetencaoDias, agora = new Date() } = {}) {
  const limite = new Date(agora.getTime() - dias * DIA_MS);
  const { total, maisAntigo } = await retencaoRepository.contarAuditoriaAntesDe(limite);
  return { itens: [{ dados: 'auditoria', dias, limite, total, maisAntigo }] };
}

/** Apaga o que o plano mostrou, em transação, e registra a limpeza na própria trilha. */
export async function executarLimpeza({ dias = env.auditoriaRetencaoDias, agora = new Date() } = {}) {
  const limite = new Date(agora.getTime() - dias * DIA_MS);
  return withTransaction(async (client) => {
    const apagados = await retencaoRepository.apagarAuditoriaAntesDe(limite, client);
    if (apagados > 0) await retencaoRepository.registrarLimpezaNaAuditoria(client);
    return { itens: [{ dados: 'auditoria', dias, limite, apagados }] };
  });
}
