/**
 * Dados da instituição (controladora dos dados) e do fornecedor do sistema.
 * ⚠ PREENCHER antes de usar em produção: aparecem na Política de Privacidade, nos Termos
 * de Uso e no rodapé. Os textos são RASCUNHO e precisam de revisão jurídica.
 */
export const INSTITUICAO = {
  nome: '[PREENCHER: nome da escola]',
  cnpj: '[PREENCHER: CNPJ da escola]',
  endereco: '[PREENCHER: endereço completo da escola]',
  contato: '[PREENCHER: e-mail ou telefone da secretaria]',
  encarregado: {
    nome: '[PREENCHER: nome do encarregado de dados (DPO)]',
    email: '[PREENCHER: e-mail do encarregado de dados]',
  },
  // Quem desenvolve e mantém o sistema (pode ser a própria escola ou uma empresa contratada).
  fornecedor: '[PREENCHER: empresa ou pessoa responsável pelo sistema]',
  // Onde o sistema fica hospedado (operador de dados).
  hospedagem: '[PREENCHER: empresa de hospedagem e país]',
};

/**
 * Versão vigente da Política de Privacidade + Termos (data da última mudança no texto).
 * MUDAR AQUI E em backend/src/config/termos.js (TERMOS_VERSAO): todos aceitam de novo.
 */
export const DOCUMENTOS_VERSAO = '2026-11-06';

/** Ainda há campos [PREENCHER] (os documentos mostram o aviso de rascunho em destaque). */
export function instituicaoIncompleta() {
  return JSON.stringify(INSTITUICAO).includes('[PREENCHER');
}
