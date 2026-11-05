import { pool } from '../database/pool.js';
import { containsPattern } from '../database/sqlHelpers.js';

const COLUMNS = 'id, nome, descricao, ativo, criado_em, atualizado_em';

export async function findById(id, db = pool) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM disciplinas WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Lista paginada. Filtros opcionais: busca (nome), ativo. */
export async function list({ page, pageSize, busca, ativo }) {
  const conditions = [];
  const params = [];

  if (busca) {
    params.push(containsPattern(busca));
    conditions.push(`nome ILIKE $${params.length}`);
  }
  if (ativo !== undefined) {
    params.push(ativo);
    conditions.push(`ativo = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countResult, pageResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM disciplinas ${where}`, params),
    pool.query(
      `SELECT ${COLUMNS} FROM disciplinas ${where}
       ORDER BY nome ASC, id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);

  return { rows: pageResult.rows, total: countResult.rows[0].total };
}

export async function create({ nome, descricao }) {
  const { rows } = await pool.query(
    `INSERT INTO disciplinas (nome, descricao) VALUES ($1, $2) RETURNING ${COLUMNS}`,
    [nome, descricao],
  );
  return rows[0];
}

export async function update(id, { nome, descricao }) {
  const { rows } = await pool.query(
    `UPDATE disciplinas SET nome = $2, descricao = $3 WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, nome, descricao],
  );
  return rows[0] ?? null;
}

export async function setAtivo(id, ativo) {
  const { rows } = await pool.query(
    `UPDATE disciplinas SET ativo = $2 WHERE id = $1 RETURNING ${COLUMNS}`,
    [id, ativo],
  );
  return rows[0] ?? null;
}
