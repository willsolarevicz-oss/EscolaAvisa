import * as disciplinaRepository from '../repositories/disciplinaRepository.js';
import { AppError } from '../utils/AppError.js';
import { rethrowUniqueAsConflict } from '../utils/dbErrors.js';
import { toPagination } from '../utils/pagination.js';
import { toDisciplinaResponse } from '../utils/serializers.js';
import { isUuid } from '../utils/uuid.js';

const NOT_FOUND = 'Disciplina não encontrada.';

const UNIQUE_MESSAGES = {
  disciplinas_nome_unique: { field: 'nome', message: 'Já existe uma disciplina com este nome.' },
};
const rethrowAsConflict = (error) => rethrowUniqueAsConflict(error, UNIQUE_MESSAGES);

async function findOrFail(id) {
  const disciplina = isUuid(id) ? await disciplinaRepository.findById(id) : null;
  if (!disciplina) throw AppError.notFound(NOT_FOUND);
  return disciplina;
}

export async function listDisciplinas({ page, pageSize, busca, ativo }) {
  const { rows, total } = await disciplinaRepository.list({ page, pageSize, busca, ativo });
  return { items: rows.map(toDisciplinaResponse), pagination: toPagination({ page, pageSize, total }) };
}

export async function getDisciplina(id) {
  return toDisciplinaResponse(await findOrFail(id));
}

export async function createDisciplina(data) {
  try {
    return toDisciplinaResponse(await disciplinaRepository.create(data));
  } catch (error) {
    return rethrowAsConflict(error);
  }
}

export async function updateDisciplina(id, data) {
  await findOrFail(id);
  try {
    const disciplina = await disciplinaRepository.update(id, data);
    if (!disciplina) throw AppError.notFound(NOT_FOUND);
    return toDisciplinaResponse(disciplina);
  } catch (error) {
    return rethrowAsConflict(error);
  }
}

/** Desativar não remove atribuições existentes; só impede novas (ver turmaService). */
export async function setDisciplinaAtivo(id, ativo) {
  await findOrFail(id);
  const disciplina = await disciplinaRepository.setAtivo(id, ativo);
  if (!disciplina) throw AppError.notFound(NOT_FOUND);
  return toDisciplinaResponse(disciplina);
}
