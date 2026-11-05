import { pool } from '../database/pool.js';

/** Alunos com matrícula ATIVA na turma, em ordem alfabética. */
export async function listAlunosByTurma(turmaId, db = pool) {
  const { rows } = await db.query(
    `SELECT atm.id, atm.aluno_id, atm.ano_letivo, atm.criado_em, atm.atualizado_em,
            a.nome AS aluno_nome, a.matricula AS aluno_matricula, a.ativo AS aluno_ativo
     FROM aluno_turma atm
     JOIN alunos a ON a.id = atm.aluno_id
     WHERE atm.turma_id = $1 AND atm.ativo
     ORDER BY a.nome ASC, atm.id ASC`,
    [turmaId],
  );
  return rows;
}

/** Turmas em que o aluno está ATIVO (normalmente uma por ano letivo), mais recente primeiro. */
export async function listTurmasAtivasByAluno(alunoId) {
  const { rows } = await pool.query(
    `SELECT t.id, t.nome, t.ano_letivo, t.turno, t.ativo
     FROM aluno_turma atm
     JOIN turmas t ON t.id = atm.turma_id
     WHERE atm.aluno_id = $1 AND atm.ativo
     ORDER BY t.ano_letivo DESC, t.nome ASC`,
    [alunoId],
  );
  return rows;
}

/** Matrícula ativa do aluno no ano letivo (o banco garante no máximo uma). */
export async function findAtivaByAlunoAndAno(alunoId, anoLetivo, db = pool) {
  const { rows } = await db.query(
    `SELECT atm.id, atm.turma_id, t.nome AS turma_nome
     FROM aluno_turma atm
     JOIN turmas t ON t.id = atm.turma_id
     WHERE atm.aluno_id = $1 AND atm.ano_letivo = $2 AND atm.ativo`,
    [alunoId, anoLetivo],
  );
  return rows[0] ?? null;
}

/**
 * Matricula o aluno. Se ele já esteve nesta turma (matrícula inativa), reativa a mesma
 * linha em vez de criar outra — o UNIQUE (aluno_id, turma_id) não permitiria duplicar.
 */
export async function matricular({ alunoId, turmaId, anoLetivo }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO aluno_turma (aluno_id, turma_id, ano_letivo)
     VALUES ($1, $2, $3)
     ON CONFLICT (aluno_id, turma_id) DO UPDATE SET ativo = TRUE
     RETURNING id`,
    [alunoId, turmaId, anoLetivo],
  );
  return rows[0].id;
}

/** Encerra a matrícula (ativo = false). O histórico continua no banco. */
export async function desativar(id, db = pool) {
  await db.query('UPDATE aluno_turma SET ativo = FALSE WHERE id = $1', [id]);
}

export async function desativarByAlunoAndTurma(alunoId, turmaId) {
  const { rowCount } = await pool.query(
    'UPDATE aluno_turma SET ativo = FALSE WHERE aluno_id = $1 AND turma_id = $2 AND ativo',
    [alunoId, turmaId],
  );
  return rowCount === 1;
}
