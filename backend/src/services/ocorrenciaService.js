import { ROLES } from '../config/roles.js';
import { withTransaction } from '../database/transaction.js';
import * as alunoRepository from '../repositories/alunoRepository.js';
import * as ocorrenciaRepository from '../repositories/ocorrenciaRepository.js';
import * as professorTurmaRepository from '../repositories/professorTurmaRepository.js';
import { AppError } from '../utils/AppError.js';
import { toPagination } from '../utils/pagination.js';
import {
  toCienciaResponse,
  toMinhaOcorrenciaResponse,
  toOcorrenciaResponse,
} from '../utils/serializers.js';
import { isUuid } from '../utils/uuid.js';

const NOT_FOUND = 'Ocorrência não encontrada.';

/** Professor só enxerga e gerencia as próprias ocorrências; admin, todas. */
function autorFilter(user) {
  return user.tipo_usuario === ROLES.PROFESSOR ? user.id : undefined;
}

async function findForGestaoOrFail(user, id) {
  const ocorrencia = isUuid(id) ? await ocorrenciaRepository.findById(id) : null;
  // Ocorrência de outro autor responde 404 para o professor (não revela que existe).
  if (!ocorrencia || (autorFilter(user) && ocorrencia.autor_id !== user.id)) throw AppError.notFound(NOT_FOUND);
  return ocorrencia;
}

// ---------- Gestão (ADMIN e PROFESSOR) ----------

export async function listOcorrencias(user, filters) {
  const { page, pageSize } = filters;
  const { rows, total } = await ocorrenciaRepository.list({ ...filters, autorId: autorFilter(user) });
  return { items: rows.map(toOcorrenciaResponse), pagination: toPagination({ page, pageSize, total }) };
}

export async function getOcorrencia(user, id) {
  const ocorrencia = await findForGestaoOrFail(user, id);
  const ciencias = await ocorrenciaRepository.listCiencias(id);
  return { ...toOcorrenciaResponse(ocorrencia), ciencias: ciencias.map(toCienciaResponse) };
}

/**
 * Registra a ocorrência e grava (na mesma transação) os responsáveis que devem dar ciência.
 * Diferente do aviso, pode ficar sem responsável: é um registro escolar sobre o aluno.
 */
export async function createOcorrencia(user, data) {
  const aluno = await alunoRepository.findById(data.alunoId);
  const invalid = (message) =>
    AppError.badRequest('Dados inválidos. Verifique os campos informados.', [{ field: 'alunoId', message }]);
  if (!aluno) throw invalid('Aluno não encontrado.');
  if (!aluno.ativo) throw invalid('Este aluno está desativado.');

  if (
    user.tipo_usuario === ROLES.PROFESSOR &&
    !(await professorTurmaRepository.professorLecionaParaAluno(user.id, data.alunoId))
  ) {
    throw AppError.forbidden('Você só pode registrar ocorrências de alunos das turmas em que leciona.');
  }

  const id = await withTransaction(async (client) => {
    const ocorrenciaId = await ocorrenciaRepository.create({ ...data, autorId: user.id }, client);
    await ocorrenciaRepository.insertCiencias({ ocorrenciaId, alunoId: data.alunoId }, client);
    return ocorrenciaId;
  });

  return toOcorrenciaResponse(await ocorrenciaRepository.findById(id));
}

/** Arquivar esconde a ocorrência do responsável; o registro e as ciências são mantidos. */
export async function setOcorrenciaAtivo(user, id, ativo) {
  await findForGestaoOrFail(user, id);
  await ocorrenciaRepository.setAtivo(id, ativo);
  return toOcorrenciaResponse(await ocorrenciaRepository.findById(id));
}

// ---------- Responsável ----------

export async function listMinhasOcorrencias(user, { page, pageSize, pendentes }) {
  const { rows, total } = await ocorrenciaRepository.listForUsuario(user.id, { page, pageSize, pendentes });
  return { items: rows.map(toMinhaOcorrenciaResponse), pagination: toPagination({ page, pageSize, total }) };
}

export async function getMinhaOcorrencia(user, id) {
  const ocorrencia = isUuid(id) ? await ocorrenciaRepository.findForUsuario(id, user.id) : null;
  if (!ocorrencia) throw AppError.notFound(NOT_FOUND);
  return toMinhaOcorrenciaResponse(ocorrencia);
}

/** "Estou ciente" (idempotente: a primeira ciência não é sobrescrita). */
export async function registrarCiencia(user, id) {
  const cienteEm = isUuid(id) ? await ocorrenciaRepository.registrarCiencia(id, user.id) : null;
  if (!cienteEm) throw AppError.notFound(NOT_FOUND);
  return { ciente: true, cienteEm };
}

// ---------- Professor ----------

/** Alunos que o professor pode escolher ao registrar uma ocorrência. */
export async function listMeusAlunos(user, { busca }) {
  const alunos = await professorTurmaRepository.listAlunosDoProfessor(user.id, { busca, limit: 20 });
  return alunos.map((a) => ({ id: a.id, nome: a.nome, matricula: a.matricula }));
}
