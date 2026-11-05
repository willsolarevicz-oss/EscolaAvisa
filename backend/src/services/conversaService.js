import { ROLES } from '../config/roles.js';
import { withTransaction } from '../database/transaction.js';
import * as alunoRepository from '../repositories/alunoRepository.js';
import * as conversaRepository from '../repositories/conversaRepository.js';
import { AppError } from '../utils/AppError.js';
import { toPagination } from '../utils/pagination.js';
import { toConversaResponse, toMensagemResponse } from '../utils/serializers.js';
import { isUuid } from '../utils/uuid.js';

const NOT_FOUND = 'Conversa não encontrada.';

function invalidField(field, message) {
  return AppError.badRequest('Dados inválidos. Verifique os campos informados.', [{ field, message }]);
}

/** Que conversas o usuário enxerga e de que lado ele está. */
function perspectiva(user) {
  if (user.tipo_usuario === ROLES.RESPONSAVEL) return { visao: 'RESPONSAVEL', lado: 'RESPONSAVEL', usuarioId: user.id };
  if (user.tipo_usuario === ROLES.PROFESSOR) return { visao: 'PROFESSOR', lado: 'ESCOLA', usuarioId: user.id };
  return { visao: 'SECRETARIA', lado: 'ESCOLA', usuarioId: user.id };
}

async function findVisivelOrFail(user, id, db) {
  const conversa = isUuid(id) ? await conversaRepository.findVisivel({ id, ...perspectiva(user) }, db) : null;
  // Conversa de outra pessoa responde 404 (não revela que existe).
  if (!conversa) throw AppError.notFound(NOT_FOUND);
  return conversa;
}

// ---------- Leitura ----------

export async function listConversas(user, { page, pageSize, naoLidas }) {
  const { rows, total } = await conversaRepository.list({ ...perspectiva(user), page, pageSize, naoLidas });
  return { items: rows.map(toConversaResponse), pagination: toPagination({ page, pageSize, total }) };
}

/** Conversa + todas as mensagens (em ordem de envio). Não marca como lida: ver `marcarLida`. */
export async function getConversa(user, id) {
  const conversa = await findVisivelOrFail(user, id);
  const mensagens = await conversaRepository.listMensagens(id);
  return { ...toConversaResponse(conversa), mensagens: mensagens.map((m) => toMensagemResponse(m, user.id)) };
}

export async function marcarLida(user, id) {
  await findVisivelOrFail(user, id);
  await conversaRepository.marcarLida(id, perspectiva(user).lado);
  return { lida: true };
}

// ---------- Envio ----------

export async function enviarMensagem(user, id, { conteudo }) {
  const { lado } = perspectiva(user);
  return withTransaction(async (client) => {
    await findVisivelOrFail(user, id, client);
    await conversaRepository.insertMensagem({ conversaId: id, autorId: user.id, conteudo, lado }, client);
  }).then(() => getConversa(user, id));
}

/**
 * Quem pode falar com quem (a conversa é sempre sobre um aluno):
 * - RESPONSAVEL: sobre aluno com vínculo autorizado; com a secretaria ou um professor do aluno;
 * - PROFESSOR  : com responsável autorizado de aluno das turmas dele (canal PROFESSOR);
 * - ADMIN      : com responsável autorizado de qualquer aluno ativo (canal SECRETARIA).
 */
async function resolverParticipantes(user, data) {
  if (user.tipo_usuario === ROLES.RESPONSAVEL) {
    if (!(await conversaRepository.isResponsavelAutorizado(user.id, data.alunoId))) {
      throw AppError.forbidden('Você só pode iniciar conversas sobre alunos vinculados a você.');
    }
    if (!data.canal) throw invalidField('canal', 'Escolha com quem quer falar.');
    if (data.canal === 'PROFESSOR') {
      if (!data.professorId) throw invalidField('professorId', 'Selecione o professor.');
      if (!(await conversaRepository.professorAtendeAluno(data.professorId, data.alunoId))) {
        throw invalidField('professorId', 'Este professor não dá aula para o aluno.');
      }
    }
    return {
      responsavelUsuarioId: user.id,
      canal: data.canal,
      professorUsuarioId: data.canal === 'PROFESSOR' ? data.professorId : null,
    };
  }

  // Escola (ADMIN ou PROFESSOR) iniciando com um responsável.
  if (user.tipo_usuario === ROLES.PROFESSOR) {
    if (!(await conversaRepository.professorAtendeAluno(user.id, data.alunoId))) {
      throw AppError.forbidden('Você só pode conversar com responsáveis de alunos das suas turmas.');
    }
  } else {
    const aluno = await alunoRepository.findById(data.alunoId);
    if (!aluno) throw invalidField('alunoId', 'Aluno não encontrado.');
    if (!aluno.ativo) throw invalidField('alunoId', 'Este aluno está desativado.');
  }
  if (!data.responsavelId) throw invalidField('responsavelId', 'Selecione o responsável.');
  if (!(await conversaRepository.isResponsavelAutorizado(data.responsavelId, data.alunoId))) {
    throw invalidField('responsavelId', 'Este responsável não está autorizado a receber comunicações deste aluno.');
  }
  const isProfessor = user.tipo_usuario === ROLES.PROFESSOR;
  return {
    responsavelUsuarioId: data.responsavelId,
    canal: isProfessor ? 'PROFESSOR' : 'SECRETARIA',
    professorUsuarioId: isProfessor ? user.id : null,
  };
}

/** Cria a conversa já com a primeira mensagem (mesma transação: não existe conversa vazia). */
export async function iniciarConversa(user, data) {
  const participantes = await resolverParticipantes(user, data);
  const { lado } = perspectiva(user);

  const id = await withTransaction(async (client) => {
    const conversaId = await conversaRepository.create(
      { alunoId: data.alunoId, assunto: data.assunto, iniciadaPor: user.id, ...participantes },
      client,
    );
    await conversaRepository.insertMensagem({ conversaId, autorId: user.id, conteudo: data.mensagem, lado }, client);
    return conversaId;
  });

  return getConversa(user, id);
}

// ---------- Opções para "nova conversa" ----------

/**
 * RESPONSAVEL: seus alunos e, para cada um, os professores com quem pode falar.
 * ADMIN/PROFESSOR (com `alunoId`): responsáveis autorizados daquele aluno.
 */
export async function getContatos(user, { alunoId }) {
  if (user.tipo_usuario === ROLES.RESPONSAVEL) {
    const alunos = await conversaRepository.listAlunosDoResponsavel(user.id);
    const professores = await conversaRepository.listProfessoresDosAlunos(alunos.map((a) => a.id));
    return {
      alunos: alunos.map((aluno) => ({
        id: aluno.id,
        nome: aluno.nome,
        professores: professores
          .filter((p) => p.aluno_id === aluno.id)
          .map((p) => ({ id: p.id, nome: p.nome, disciplinas: p.disciplinas })),
      })),
    };
  }

  if (!alunoId) throw invalidField('alunoId', 'Selecione o aluno.');
  if (user.tipo_usuario === ROLES.PROFESSOR && !(await conversaRepository.professorAtendeAluno(user.id, alunoId))) {
    throw AppError.forbidden('Você só pode conversar com responsáveis de alunos das suas turmas.');
  }
  const responsaveis = await conversaRepository.listResponsaveisDoAluno(alunoId);
  return {
    responsaveis: responsaveis.map((r) => ({
      id: r.id,
      nome: r.nome,
      parentesco: r.parentesco,
      principal: r.responsavel_principal,
    })),
  };
}
