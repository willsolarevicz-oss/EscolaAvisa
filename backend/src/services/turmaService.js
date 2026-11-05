import { ROLES } from '../config/roles.js';
import { withTransaction } from '../database/transaction.js';
import * as alunoRepository from '../repositories/alunoRepository.js';
import * as alunoTurmaRepository from '../repositories/alunoTurmaRepository.js';
import * as disciplinaRepository from '../repositories/disciplinaRepository.js';
import * as professorTurmaRepository from '../repositories/professorTurmaRepository.js';
import * as turmaRepository from '../repositories/turmaRepository.js';
import * as usuarioRepository from '../repositories/usuarioRepository.js';
import { AppError } from '../utils/AppError.js';
import { rethrowUniqueAsConflict } from '../utils/dbErrors.js';
import { toPagination } from '../utils/pagination.js';
import { toAtribuicaoResponse, toMatriculaResponse, toTurmaResponse } from '../utils/serializers.js';
import { isUuid } from '../utils/uuid.js';

const TURMA_NOT_FOUND = 'Turma não encontrada.';

const UNIQUE_MESSAGES = {
  turmas_nome_ano_turno_unique: {
    field: 'nome',
    message: 'Já existe uma turma com este nome neste ano letivo e turno.',
  },
  professor_turma_unique: {
    field: 'professorId',
    message: 'Este professor já leciona esta disciplina nesta turma.',
  },
  // Só em corrida: o service verifica a matrícula existente antes de inserir.
  aluno_turma_ativa_por_ano_unique: {
    field: 'alunoId',
    message: 'O aluno já está matriculado em outra turma neste ano letivo.',
  },
};
const rethrowAsConflict = (error) => rethrowUniqueAsConflict(error, UNIQUE_MESSAGES);

function invalidField(field, message) {
  return AppError.badRequest('Dados inválidos. Verifique os campos informados.', [{ field, message }]);
}

async function findTurmaOrFail(id) {
  const turma = isUuid(id) ? await turmaRepository.findById(id) : null;
  if (!turma) throw AppError.notFound(TURMA_NOT_FOUND);
  return turma;
}

async function findTurmaAtivaOrFail(id) {
  const turma = await findTurmaOrFail(id);
  if (!turma.ativo) throw AppError.badRequest('Esta turma está desativada. Reative-a antes de alterar.');
  return turma;
}

// ---------- Turmas ----------

export async function listTurmas({ page, pageSize, busca, anoLetivo, turno, ativo }) {
  const { rows, total } = await turmaRepository.list({ page, pageSize, busca, anoLetivo, turno, ativo });
  return { items: rows.map(toTurmaResponse), pagination: toPagination({ page, pageSize, total }) };
}

/** Turma com alunos matriculados e professores (a tela de edição usa tudo junto). */
export async function getTurma(id) {
  const turma = await findTurmaOrFail(id);
  const [alunos, professores] = await Promise.all([
    alunoTurmaRepository.listAlunosByTurma(id),
    professorTurmaRepository.listByTurma(id),
  ]);
  return {
    ...toTurmaResponse(turma),
    alunos: alunos.map(toMatriculaResponse),
    professores: professores.map(toAtribuicaoResponse),
  };
}

export async function createTurma(data) {
  try {
    return toTurmaResponse(await turmaRepository.create(data));
  } catch (error) {
    return rethrowAsConflict(error);
  }
}

export async function updateTurma(id, data) {
  const atual = await findTurmaOrFail(id);

  // Trocar o ano levaria as matrículas junto (FK ON UPDATE CASCADE) sem ninguém perceber.
  if (data.anoLetivo !== atual.ano_letivo && (await turmaRepository.hasMatriculas(id))) {
    throw invalidField(
      'anoLetivo',
      'Não é possível mudar o ano letivo de uma turma que já teve alunos matriculados. Crie uma nova turma.',
    );
  }

  try {
    const turma = await turmaRepository.update(id, data);
    if (!turma) throw AppError.notFound(TURMA_NOT_FOUND);
    return toTurmaResponse(turma);
  } catch (error) {
    return rethrowAsConflict(error);
  }
}

/** Desativar mantém matrículas e atribuições (histórico); só impede novas alterações. */
export async function setTurmaAtivo(id, ativo) {
  await findTurmaOrFail(id);
  const turma = await turmaRepository.setAtivo(id, ativo);
  if (!turma) throw AppError.notFound(TURMA_NOT_FOUND);
  return toTurmaResponse(turma);
}

// ---------- Matrículas ----------

export async function listAlunos(turmaId) {
  await findTurmaOrFail(turmaId);
  return (await alunoTurmaRepository.listAlunosByTurma(turmaId)).map(toMatriculaResponse);
}

/**
 * Matricula um aluno ATIVO na turma. Se ele já está em outra turma do mesmo ano:
 * sem `transferir` → 409 (com o campo "transferir" para a tela oferecer a transferência);
 * com `transferir` → encerra a matrícula anterior e cria a nova na mesma transação.
 */
export async function matricularAluno(turmaId, { alunoId, transferir }) {
  const turma = await findTurmaAtivaOrFail(turmaId);

  const aluno = await alunoRepository.findById(alunoId);
  if (!aluno) throw invalidField('alunoId', 'Aluno não encontrado.');
  if (!aluno.ativo) throw invalidField('alunoId', 'Este aluno está desativado. Reative-o antes de matricular.');

  const atual = await alunoTurmaRepository.findAtivaByAlunoAndAno(alunoId, turma.ano_letivo);
  if (atual?.turma_id === turmaId) {
    throw AppError.conflict('Este aluno já está matriculado nesta turma.');
  }
  if (atual && !transferir) {
    const message = `${aluno.nome} já tem matrícula ativa na turma ${atual.turma_nome} em ${turma.ano_letivo}. Confirme a transferência.`;
    throw new AppError(message, 409, [{ field: 'transferir', message }]);
  }

  try {
    await withTransaction(async (client) => {
      if (atual) await alunoTurmaRepository.desativar(atual.id, client);
      await alunoTurmaRepository.matricular({ alunoId, turmaId, anoLetivo: turma.ano_letivo }, client);
    });
  } catch (error) {
    rethrowAsConflict(error);
  }

  return {
    alunos: (await alunoTurmaRepository.listAlunosByTurma(turmaId)).map(toMatriculaResponse),
    transferidoDe: atual ? { id: atual.turma_id, nome: atual.turma_nome } : null,
  };
}

/** Encerra a matrícula do aluno nesta turma (o registro fica como histórico). */
export async function removerAluno(turmaId, alunoId) {
  await findTurmaOrFail(turmaId);
  const removed = isUuid(alunoId) && (await alunoTurmaRepository.desativarByAlunoAndTurma(alunoId, turmaId));
  if (!removed) throw AppError.notFound('Este aluno não está matriculado nesta turma.');
}

// ---------- Professores ----------

export async function listProfessores(turmaId) {
  await findTurmaOrFail(turmaId);
  return (await professorTurmaRepository.listByTurma(turmaId)).map(toAtribuicaoResponse);
}

export async function atribuirProfessor(turmaId, { professorId, disciplinaId }) {
  await findTurmaAtivaOrFail(turmaId);

  const professor = await usuarioRepository.findById(professorId);
  if (!professor) throw invalidField('professorId', 'Professor não encontrado.');
  if (professor.tipo_usuario !== ROLES.PROFESSOR) {
    throw invalidField('professorId', 'O usuário selecionado não é um professor.');
  }
  if (!professor.ativo) throw invalidField('professorId', 'Este professor está desativado.');

  const disciplina = await disciplinaRepository.findById(disciplinaId);
  if (!disciplina) throw invalidField('disciplinaId', 'Disciplina não encontrada.');
  if (!disciplina.ativo) throw invalidField('disciplinaId', 'Esta disciplina está desativada.');

  try {
    const id = await professorTurmaRepository.create({ professorId, turmaId, disciplinaId });
    return toAtribuicaoResponse(await professorTurmaRepository.findByIdForTurma(id, turmaId));
  } catch (error) {
    return rethrowAsConflict(error);
  }
}

export async function removerAtribuicao(turmaId, atribuicaoId) {
  await findTurmaOrFail(turmaId);
  const removed = isUuid(atribuicaoId) && (await professorTurmaRepository.remove(atribuicaoId, turmaId));
  if (!removed) throw AppError.notFound('Atribuição não encontrada.');
}

// ---------- Professor ("Minhas turmas") ----------

/** Alunos de uma turma em que o professor leciona (outra turma → 403, inexistente → 404). */
export async function listAlunosDaTurmaDoProfessor(user, turmaId) {
  const turma = isUuid(turmaId) ? await turmaRepository.findById(turmaId) : null;
  if (!turma) throw AppError.notFound(TURMA_NOT_FOUND);
  if (!(await professorTurmaRepository.professorLecionaNaTurma(user.id, turmaId))) {
    throw AppError.forbidden('Você só pode ver os alunos das turmas em que leciona.');
  }
  const alunos = await professorTurmaRepository.listAlunosDaTurmaComContato(turmaId);
  return {
    turma: { id: turma.id, nome: turma.nome, anoLetivo: turma.ano_letivo, turno: turma.turno, ativo: turma.ativo },
    alunos: alunos.map((a) => ({
      id: a.id,
      nome: a.nome,
      matricula: a.matricula,
      responsaveisAutorizados: a.responsaveis_autorizados,
    })),
  };
}
