import { pool } from '../database/pool.js';

const SELECT_ATRIBUICAO = `
  SELECT pt.id, pt.turma_id, pt.criado_em,
         pt.professor_id, u.nome AS professor_nome, u.email AS professor_email, u.ativo AS professor_ativo,
         pt.disciplina_id, d.nome AS disciplina_nome, d.ativo AS disciplina_ativo
  FROM professor_turma pt
  JOIN usuarios u ON u.id = pt.professor_id
  JOIN disciplinas d ON d.id = pt.disciplina_id`;

/** Atribuições da turma, agrupáveis por disciplina (ordem: disciplina, professor). */
export async function listByTurma(turmaId) {
  const { rows } = await pool.query(
    `${SELECT_ATRIBUICAO} WHERE pt.turma_id = $1 ORDER BY d.nome ASC, u.nome ASC, pt.id ASC`,
    [turmaId],
  );
  return rows;
}

export async function findByIdForTurma(id, turmaId) {
  const { rows } = await pool.query(`${SELECT_ATRIBUICAO} WHERE pt.id = $1 AND pt.turma_id = $2`, [id, turmaId]);
  return rows[0] ?? null;
}

export async function create({ professorId, turmaId, disciplinaId }) {
  const { rows } = await pool.query(
    'INSERT INTO professor_turma (professor_id, turma_id, disciplina_id) VALUES ($1, $2, $3) RETURNING id',
    [professorId, turmaId, disciplinaId],
  );
  return rows[0].id;
}

export async function remove(id, turmaId) {
  const { rowCount } = await pool.query('DELETE FROM professor_turma WHERE id = $1 AND turma_id = $2', [
    id,
    turmaId,
  ]);
  return rowCount === 1;
}
