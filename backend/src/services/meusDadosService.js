import { ROLES } from '../config/roles.js';
import * as aceiteTermosRepository from '../repositories/aceiteTermosRepository.js';
import * as meusDadosRepository from '../repositories/meusDadosRepository.js';

const LIMITE_ACOES = 200;

/**
 * Cópia dos dados pessoais do usuário logado (LGPD art. 18: acesso e portabilidade), em formato
 * aberto (JSON). Nunca inclui a senha (nem o hash) e só traz o que é da própria pessoa.
 */
export async function exportarMeusDados(user) {
  const isResponsavel = user.tipo_usuario === ROLES.RESPONSAVEL;
  const [responsavel, alunos, avisos, ocorrencias, mensagens, aceites, acoes] = await Promise.all([
    isResponsavel ? meusDadosRepository.responsavel(user.id) : null,
    isResponsavel ? meusDadosRepository.alunosVinculados(user.id) : [],
    meusDadosRepository.avisosRecebidos(user.id),
    meusDadosRepository.ocorrenciasComCiencia(user.id),
    meusDadosRepository.mensagensEnviadas(user.id),
    aceiteTermosRepository.listByUsuario(user.id),
    meusDadosRepository.acoesRegistradas(user.id, LIMITE_ACOES),
  ]);

  return {
    geradoEm: new Date().toISOString(),
    conta: {
      nome: user.nome,
      email: user.email,
      perfil: user.tipo_usuario,
      ativo: user.ativo,
      criadoEm: user.criado_em,
    },
    responsavel: responsavel ? { telefone: responsavel.telefone, cpf: responsavel.cpf } : null,
    alunosVinculados: alunos.map((a) => ({
      nome: a.nome,
      matricula: a.matricula,
      dataNascimento: a.data_nascimento,
      parentesco: a.parentesco,
      responsavelPrincipal: a.responsavel_principal,
      recebeComunicacoes: a.autorizado_receber_comunicacoes,
    })),
    avisosRecebidos: avisos.map((a) => ({ titulo: a.titulo, publicadoEm: a.publicado_em, lidoEm: a.visualizado_em })),
    ocorrencias: ocorrencias.map((o) => ({
      aluno: o.aluno_nome,
      tipo: o.tipo,
      data: o.data_ocorrencia,
      descricao: o.descricao,
      cienteEm: o.ciente_em,
    })),
    mensagensEnviadas: mensagens.map((m) => ({ conversa: m.assunto, conteudo: m.conteudo, enviadaEm: m.enviada_em })),
    aceitesDeTermos: aceites.map((a) => ({ versao: a.versao, aceitoEm: a.aceito_em })),
    acoesRegistradas: {
      observacao: `Últimas ${LIMITE_ACOES} ações que alteraram dados (inclui o IP de origem).`,
      itens: acoes.map((a) => ({ metodo: a.metodo, rota: a.rota, status: a.status, ip: a.ip, em: a.criado_em })),
    },
  };
}
