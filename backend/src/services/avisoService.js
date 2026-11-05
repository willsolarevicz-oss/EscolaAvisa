import { ROLES } from '../config/roles.js';
import { withTransaction } from '../database/transaction.js';
import * as alunoRepository from '../repositories/alunoRepository.js';
import * as avisoRepository from '../repositories/avisoRepository.js';
import * as professorTurmaRepository from '../repositories/professorTurmaRepository.js';
import * as turmaRepository from '../repositories/turmaRepository.js';
import { AppError } from '../utils/AppError.js';
import { toPagination } from '../utils/pagination.js';
import { toAvisoResponse, toDestinatarioResponse, toMeuAvisoResponse } from '../utils/serializers.js';
import { isUuid } from '../utils/uuid.js';

const NOT_FOUND = 'Aviso não encontrado.';

function invalidField(field, message) {
  return AppError.badRequest('Dados inválidos. Verifique os campos informados.', [{ field, message }]);
}

/** Professor só enxerga e gerencia os próprios avisos; admin, todos. */
function autorFilter(user) {
  return user.tipo_usuario === ROLES.PROFESSOR ? user.id : undefined;
}

async function findAvisoForGestaoOrFail(user, id) {
  const aviso = isUuid(id) ? await avisoRepository.findById(id) : null;
  // Aviso de outro autor responde 404 para o professor (não revela que existe).
  if (!aviso || (autorFilter(user) && aviso.autor_id !== user.id)) throw AppError.notFound(NOT_FOUND);
  return aviso;
}

/** Regras de quem pode publicar para quem. */
async function validatePublico(user, { publico, turmaId, alunoId }) {
  if (user.tipo_usuario === ROLES.PROFESSOR) {
    if (publico !== 'TURMA') {
      throw AppError.forbidden('Professores só podem enviar avisos para turmas em que lecionam.');
    }
    if (isUuid(turmaId) && !(await professorTurmaRepository.professorLecionaNaTurma(user.id, turmaId))) {
      throw AppError.forbidden('Você só pode enviar avisos para turmas em que leciona.');
    }
  }

  if (publico === 'TURMA') {
    const turma = await turmaRepository.findById(turmaId);
    if (!turma) throw invalidField('turmaId', 'Turma não encontrada.');
    if (!turma.ativo) throw invalidField('turmaId', 'Esta turma está desativada.');
  }

  if (publico === 'ALUNO') {
    const aluno = await alunoRepository.findById(alunoId);
    if (!aluno) throw invalidField('alunoId', 'Aluno não encontrado.');
    if (!aluno.ativo) throw invalidField('alunoId', 'Este aluno está desativado.');
  }
}

// ---------- Gestão (ADMIN e PROFESSOR) ----------

export async function listAvisos(user, { page, pageSize, busca, publico, ativo }) {
  const { rows, total } = await avisoRepository.list({
    page,
    pageSize,
    busca,
    publico,
    ativo,
    autorId: autorFilter(user),
  });
  return { items: rows.map(toAvisoResponse), pagination: toPagination({ page, pageSize, total }) };
}

/** Detalhe com a lista de destinatários e quem já leu. */
export async function getAviso(user, id) {
  const aviso = await findAvisoForGestaoOrFail(user, id);
  const destinatarios = await avisoRepository.listDestinatarios(id);
  return { ...toAvisoResponse(aviso), destinatarios: destinatarios.map(toDestinatarioResponse) };
}

/**
 * Publica o aviso e grava os destinatários na mesma transação.
 * Se nenhum responsável se encaixar, nada é gravado (400).
 */
export async function createAviso(user, data) {
  await validatePublico(user, data);

  const avisoId = await withTransaction(async (client) => {
    const id = await avisoRepository.create({ ...data, autorId: user.id }, client);
    const total = await avisoRepository.insertDestinatarios(
      { avisoId: id, publico: data.publico, turmaId: data.turmaId, alunoId: data.alunoId },
      client,
    );
    if (total === 0) {
      // Lançar aqui desfaz o INSERT do aviso (ROLLBACK).
      throw AppError.badRequest(
        'Nenhum responsável receberia este aviso. Verifique se os alunos têm responsáveis ativos e autorizados a receber comunicações.',
      );
    }
    return id;
  });

  return toAvisoResponse(await avisoRepository.findById(avisoId));
}

/** Arquivar (ativo = false) esconde o aviso dos responsáveis; reativar mostra de novo. */
export async function setAvisoAtivo(user, id, ativo) {
  await findAvisoForGestaoOrFail(user, id);
  await avisoRepository.setAtivo(id, ativo);
  return toAvisoResponse(await avisoRepository.findById(id));
}

// ---------- Responsável (destinatário) ----------

export async function listMeusAvisos(user, { page, pageSize, naoLidos }) {
  const { rows, total } = await avisoRepository.listForUsuario(user.id, { page, pageSize, naoLidos });
  return { items: rows.map(toMeuAvisoResponse), pagination: toPagination({ page, pageSize, total }) };
}

export async function getMeuAviso(user, id) {
  const aviso = isUuid(id) ? await avisoRepository.findForUsuario(id, user.id) : null;
  if (!aviso) throw AppError.notFound(NOT_FOUND);
  return toMeuAvisoResponse(aviso);
}

/** Registra a leitura (idempotente: a primeira leitura não é sobrescrita). */
export async function marcarComoLido(user, id) {
  const visualizadoEm = isUuid(id) ? await avisoRepository.marcarLido(id, user.id) : null;
  if (!visualizadoEm) throw AppError.notFound(NOT_FOUND);
  return { lido: true, visualizadoEm };
}

// ---------- Professor ----------

export async function listMinhasTurmas(user) {
  const turmas = await professorTurmaRepository.listTurmasDoProfessor(user.id);
  return turmas.map((t) => ({
    id: t.id,
    nome: t.nome,
    anoLetivo: t.ano_letivo,
    turno: t.turno,
    disciplinas: t.disciplinas,
  }));
}
