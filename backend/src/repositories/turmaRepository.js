import { pool } from '../database/pool.js';
import { buscaSemAcento, containsPattern } from '../database/sqlHelpers.js';

// Contagens para a listagem: alunos com matrícula ATIVA e professores distintos.
const SELECT_TURMA = `
  SELECT t.id, t.nome, t.ano_letivo, t.turno, t.descricao, t.ativo, t.criado_em, t.atualizado_em,
         (SELECT COUNT(*)::int FROM aluno_turma atm WHERE atm.turma_id = t.id AND atm.ativo) AS total_alunos,
         (SELECT COUNT(DISTINCT pt.professor_id)::int FROM professor_turma pt WHERE pt.turma_id = t.id)
           AS total_professores
  FROM turmas t`;

export async function findById(id, db = pool) {
  const { rows } = await db.query(`${SELECT_TURMA} WHERE t.id = $1`, [id]);
  return rows[0] ?? null;
}

/** Lista paginada. Filtros opcionais: busca (nome), anoLetivo, turno, ativo. Mais recentes primeiro. */
export async function list({ page, pageSize, busca, anoLetivo, turno, ativo }) {
  const conditions = [];
  const params = [];

  if (busca) {
    params.push(containsPattern(busca));
    conditions.push(buscaSemAcento(['t.nome'], `$${params.length}`));
  }
  if (anoLetivo !== undefined) {
    params.push(anoLetivo);
    conditions.push(`t.ano_letivo = $${params.length}`);
  }
  if (turno) {
    params.push(turno);
    conditions.push(`t.turno = $${params.length}`);
  }
  if (ativo !== undefined) {
    params.push(ativo);
    conditions.push(`t.ativo = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countResult, pageResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM turmas t ${where}`, params),
    pool.query(
      `${SELECT_TURMA} ${where}
       ORDER BY t.ano_letivo DESC, t.nome ASC, t.id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);

  return { rows: pageResult.rows, total: countResult.rows[0].total };
}

export async function create({ nome, anoLetivo, turno, descricao }) {
  const { rows } = await pool.query(
    'INSERT INTO turmas (nome, ano_letivo, turno, descricao) VALUES ($1, $2, $3, $4) RETURNING id',
    [nome, anoLetivo, turno, descricao],
  );
  return findById(rows[0].id);
}

export async function update(id, { nome, anoLetivo, turno, descricao }) {
  const { rowCount } = await pool.query(
    'UPDATE turmas SET nome = $2, ano_letivo = $3, turno = $4, descricao = $5 WHERE id = $1',
    [id, nome, anoLetivo, turno, descricao],
  );
  return rowCount === 1 ? findById(id) : null;
}

export async function setAtivo(id, ativo) {
  const { rowCount } = await pool.query('UPDATE turmas SET ativo = $2 WHERE id = $1', [id, ativo]);
  return rowCount === 1 ? findById(id) : null;
}

/** Existe alguma matrícula (ativa ou histórica)? Usado para travar a troca de ano letivo. */
export async function hasMatriculas(id) {
  const { rowCount } = await pool.query('SELECT 1 FROM aluno_turma WHERE turma_id = $1 LIMIT 1', [id]);
  return rowCount > 0;
}
