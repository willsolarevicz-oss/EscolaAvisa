import { pool } from '../database/pool.js';

// Vínculo + dados do responsável (vindos de usuarios/responsaveis) para exibir sem outra consulta.
const SELECT_VINCULO = `
  SELECT ar.id, ar.aluno_id, ar.responsavel_id, ar.parentesco, ar.responsavel_principal,
         ar.autorizado_receber_comunicacoes, ar.criado_em, ar.atualizado_em,
         u.id AS usuario_id, u.nome AS usuario_nome, u.email AS usuario_email, u.ativo AS usuario_ativo,
         r.telefone AS responsavel_telefone
  FROM aluno_responsavel ar
  JOIN responsaveis r ON r.id = ar.responsavel_id
  JOIN usuarios u ON u.id = r.usuario_id`;

/** Principal primeiro, depois por nome. */
export async function listByAluno(alunoId, db = pool) {
  const { rows } = await db.query(
    `${SELECT_VINCULO} WHERE ar.aluno_id = $1
     ORDER BY ar.responsavel_principal DESC, u.nome ASC, ar.id ASC`,
    [alunoId],
  );
  return rows;
}

/** Busca o vínculo garantindo que ele pertence ao aluno informado. */
export async function findByIdForAluno(id, alunoId, db = pool) {
  const { rows } = await db.query(`${SELECT_VINCULO} WHERE ar.id = $1 AND ar.aluno_id = $2`, [id, alunoId]);
  return rows[0] ?? null;
}

/** Remove a marcação de principal dos outros vínculos do aluno (só um pode ser principal). */
export async function clearPrincipal(alunoId, exceptId, db = pool) {
  await db.query(
    `UPDATE aluno_responsavel SET responsavel_principal = FALSE
     WHERE aluno_id = $1 AND responsavel_principal AND ($2::uuid IS NULL OR id <> $2)`,
    [alunoId, exceptId ?? null],
  );
}

export async function create(
  { alunoId, responsavelId, parentesco, responsavelPrincipal, autorizadoReceberComunicacoes },
  db = pool,
) {
  const { rows } = await db.query(
    `INSERT INTO aluno_responsavel
       (aluno_id, responsavel_id, parentesco, responsavel_principal, autorizado_receber_comunicacoes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [alunoId, responsavelId, parentesco, responsavelPrincipal, autorizadoReceberComunicacoes],
  );
  return rows[0].id;
}

export async function update(id, { parentesco, responsavelPrincipal, autorizadoReceberComunicacoes }, db = pool) {
  await db.query(
    `UPDATE aluno_responsavel
     SET parentesco = $2, responsavel_principal = $3, autorizado_receber_comunicacoes = $4
     WHERE id = $1`,
    [id, parentesco, responsavelPrincipal, autorizadoReceberComunicacoes],
  );
}

export async function remove(id, alunoId) {
  const { rowCount } = await pool.query('DELETE FROM aluno_responsavel WHERE id = $1 AND aluno_id = $2', [
    id,
    alunoId,
  ]);
  return rowCount === 1;
}
