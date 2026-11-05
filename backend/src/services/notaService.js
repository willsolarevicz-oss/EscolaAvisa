import { ROLES } from '../config/roles.js';
import { withTransaction } from '../database/transaction.js';
import * as disciplinaRepository from '../repositories/disciplinaRepository.js';
import * as notaRepository from '../repositories/notaRepository.js';
import * as turmaRepository from '../repositories/turmaRepository.js';
import { AppError } from '../utils/AppError.js';
import { isUuid } from '../utils/uuid.js';
import { BIMESTRES } from '../validators/notaValidators.js';

// NUMERIC chega do pg como string ("7.5"); a API devolve número.
const toNumber = (valor) => (valor === null || valor === undefined ? null : Number(valor));

/** Média simples dos bimestres lançados, com uma casa decimal; null se não há notas. */
export function calcularMedia(notasPorBimestre) {
  const valores = Object.values(notasPorBimestre).filter((v) => v !== null);
  if (valores.length === 0) return null;
  const soma = valores.reduce((total, v) => total + v, 0);
  return Math.round((soma / valores.length) * 10) / 10;
}

function bimestresVazios() {
  return Object.fromEntries(BIMESTRES.map((b) => [b, null]));
}

/**
 * Garante que o usuário pode ver/lançar a grade desta turma + disciplina:
 * professor → precisa estar atribuído a ela; admin → ela precisa ser lecionada na turma.
 */
async function resolverGradeOrFail(user, turmaId, disciplinaId) {
  const turma = isUuid(turmaId) ? await turmaRepository.findById(turmaId) : null;
  const disciplina = isUuid(disciplinaId) ? await disciplinaRepository.findById(disciplinaId) : null;
  if (!turma || !disciplina) throw AppError.notFound('Turma ou disciplina não encontrada.');

  if (user.tipo_usuario === ROLES.PROFESSOR) {
    if (!(await notaRepository.disciplinaLecionadaNaTurma(turmaId, disciplinaId, user.id))) {
      throw AppError.forbidden('Você só pode lançar notas das disciplinas que leciona nesta turma.');
    }
  } else if (!(await notaRepository.disciplinaLecionadaNaTurma(turmaId, disciplinaId))) {
    throw AppError.notFound('Esta disciplina não é lecionada nesta turma.');
  }

  return { turma, disciplina };
}

// ---------- Lançamento (ADMIN e PROFESSOR) ----------

export async function listTurmasParaLancamento(user) {
  const professorId = user.tipo_usuario === ROLES.PROFESSOR ? user.id : null;
  const turmas = await notaRepository.listTurmasComDisciplinas(professorId);
  return turmas.map((t) => ({
    id: t.id,
    nome: t.nome,
    anoLetivo: t.ano_letivo,
    turno: t.turno,
    disciplinas: t.disciplinas,
  }));
}

export async function getGrade(user, turmaId, disciplinaId) {
  const { turma, disciplina } = await resolverGradeOrFail(user, turmaId, disciplinaId);
  const rows = await notaRepository.listGrade(turmaId, disciplinaId);

  // Agrupa as linhas (uma por nota) em um item por aluno.
  const porAluno = new Map();
  for (const row of rows) {
    if (!porAluno.has(row.aluno_id)) {
      porAluno.set(row.aluno_id, {
        aluno: { id: row.aluno_id, nome: row.aluno_nome, matricula: row.aluno_matricula },
        notas: bimestresVazios(),
      });
    }
    if (row.bimestre !== null) porAluno.get(row.aluno_id).notas[row.bimestre] = toNumber(row.valor);
  }

  return {
    turma: { id: turma.id, nome: turma.nome, anoLetivo: turma.ano_letivo, turno: turma.turno, ativo: turma.ativo },
    disciplina: { id: disciplina.id, nome: disciplina.nome },
    alunos: [...porAluno.values()].map((item) => ({ ...item, media: calcularMedia(item.notas) })),
  };
}

/**
 * Salva um lote de notas (upsert; valor null apaga) em uma transação:
 * ou todas são gravadas, ou nenhuma.
 */
export async function lancarNotas(user, turmaId, disciplinaId, { notas }) {
  const { turma } = await resolverGradeOrFail(user, turmaId, disciplinaId);
  if (!turma.ativo) throw AppError.badRequest('Esta turma está desativada: as notas não podem ser alteradas.');

  const alunoIds = [...new Set(notas.map((n) => n.alunoId))];
  const matriculados = await notaRepository.alunosMatriculados(turmaId, alunoIds);
  const foraDaTurma = alunoIds.filter((id) => !matriculados.has(id));
  if (foraDaTurma.length > 0) {
    throw AppError.badRequest('Dados inválidos. Verifique os campos informados.', [
      {
        field: 'notas',
        message:
          foraDaTurma.length === 1
            ? '1 aluno não tem matrícula ativa nesta turma.'
            : `${foraDaTurma.length} alunos não têm matrícula ativa nesta turma.`,
      },
    ]);
  }

  await withTransaction(async (client) => {
    for (const nota of notas) {
      const chave = { alunoId: nota.alunoId, turmaId, disciplinaId, bimestre: nota.bimestre };
      if (nota.valor === null) {
        await notaRepository.remove(chave, client);
      } else {
        await notaRepository.upsert({ ...chave, valor: nota.valor, lancadoPor: user.id }, client);
      }
    }
  });

  return getGrade(user, turmaId, disciplinaId);
}

// ---------- Responsável ----------

/** Boletim de cada aluno do responsável (só vínculos autorizados), por turma ativa. */
export async function getBoletim(user) {
  const rows = await notaRepository.boletimDoResponsavel(user.id);
  const boletins = new Map(); // chave: aluno + turma

  for (const row of rows) {
    const chave = `${row.aluno_id}:${row.turma_id}`;
    if (!boletins.has(chave)) {
      boletins.set(chave, {
        aluno: { id: row.aluno_id, nome: row.aluno_nome, matricula: row.aluno_matricula },
        turma: { id: row.turma_id, nome: row.turma_nome, anoLetivo: row.ano_letivo },
        disciplinas: new Map(),
      });
    }
    if (!row.disciplina_id) continue; // turma ainda sem disciplinas
    const disciplinas = boletins.get(chave).disciplinas;
    if (!disciplinas.has(row.disciplina_id)) {
      disciplinas.set(row.disciplina_id, {
        disciplina: { id: row.disciplina_id, nome: row.disciplina_nome },
        notas: bimestresVazios(),
      });
    }
    if (row.bimestre !== null) disciplinas.get(row.disciplina_id).notas[row.bimestre] = toNumber(row.valor);
  }

  return [...boletins.values()].map((b) => ({
    ...b,
    disciplinas: [...b.disciplinas.values()].map((d) => ({ ...d, media: calcularMedia(d.notas) })),
  }));
}
