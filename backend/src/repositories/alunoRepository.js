import { pool } from '../database/pool.js';

// total_responsaveis: quantos responsáveis estão vinculados (ajuda a achar alunos sem responsável).
const SELECT_ALUNO = `
  SELECT a.id, a.nome, a.data_nascimento, a.matricula, a.ativo, a.criado_em, a.atualizado_em,
         (SELECT COUNT(*)::int FROM aluno_responsavel ar WHERE ar.aluno_id = a.id) AS total_responsaveis
  FROM alunos a`;

// % e _ são curingas do LIKE: escapamos para a busca ser literal.
function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function findById(id, db = pool) {
  const { rows } = await db.query(`${SELECT_ALUNO} WHERE a.id = $1`, [id]);
  return rows[0] ?? null;
}

/**
 * Lista paginada. Filtros opcionais: busca (nome ou matrícula), ativo.
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function list({ page, pageSize, busca, ativo }) {
  const conditions = [];
  const params = [];

  if (busca) {
    params.push(`%${escapeLike(busca)}%`);
    conditions.push(`(a.nome ILIKE $${params.length} OR a.matricula ILIKE $${params.length})`);
  }
  if (ativo !== undefined) {
    params.push(ativo);
    conditions.push(`a.ativo = $${params.length}`);
  }

  // Só fragmentos fixos entram no SQL; os valores vão sempre em `params`.
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countResult, pageResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM alunos a ${where}`, params),
    pool.query(
      `${SELECT_ALUNO} ${where}
       ORDER BY a.nome ASC, a.id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);

  return { rows: pageResult.rows, total: countResult.rows[0].total };
}

export async function create({ nome, dataNascimento, matricula }) {
  const { rows } = await pool.query(
    `INSERT INTO alunos (nome, data_nascimento, matricula) VALUES ($1, $2, $3) RETURNING id`,
    [nome, dataNascimento, matricula],
  );
  return findById(rows[0].id);
}

export async function update(id, { nome, dataNascimento, matricula }) {
  const { rowCount } = await pool.query(
    'UPDATE alunos SET nome = $2, data_nascimento = $3, matricula = $4 WHERE id = $1',
    [id, nome, dataNascimento, matricula],
  );
  return rowCount === 1 ? findById(id) : null;
}

export async function setAtivo(id, ativo) {
  const { rowCount } = await pool.query('UPDATE alunos SET ativo = $2 WHERE id = $1', [id, ativo]);
  return rowCount === 1 ? findById(id) : null;
}
