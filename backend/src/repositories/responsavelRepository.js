import { pool } from '../database/pool.js';

const COLUMNS = 'id, usuario_id, telefone, cpf, criado_em, atualizado_em';

export async function findByUsuarioId(usuarioId, db = pool) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM responsaveis WHERE usuario_id = $1`, [
    usuarioId,
  ]);
  return rows[0] ?? null;
}

/**
 * Cria ou atualiza os dados de responsável de um usuário.
 * Upsert porque usuários RESPONSAVEL criados fora da API (ex.: SQL manual) podem não ter o registro.
 */
export async function upsertByUsuarioId(usuarioId, { telefone, cpf }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO responsaveis (usuario_id, telefone, cpf)
     VALUES ($1, $2, $3)
     ON CONFLICT (usuario_id) DO UPDATE SET telefone = EXCLUDED.telefone, cpf = EXCLUDED.cpf
     RETURNING ${COLUMNS}`,
    [usuarioId, telefone, cpf],
  );
  return rows[0];
}
