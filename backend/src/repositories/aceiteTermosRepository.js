import { pool } from '../database/pool.js';

export async function jaAceitou(usuarioId, versao) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM aceites_termos WHERE usuario_id = $1 AND versao = $2 LIMIT 1',
    [usuarioId, versao],
  );
  return rowCount > 0;
}

/** Registra o aceite. Idempotente: aceitar de novo a mesma versão mantém a data do primeiro. */
export async function registrar({ usuarioId, versao, ip }) {
  await pool.query(
    `INSERT INTO aceites_termos (usuario_id, versao, ip) VALUES ($1, $2, $3)
     ON CONFLICT (usuario_id, versao) DO NOTHING`,
    [usuarioId, versao, ip],
  );
}

export async function listByUsuario(usuarioId) {
  const { rows } = await pool.query(
    'SELECT versao, aceito_em FROM aceites_termos WHERE usuario_id = $1 ORDER BY aceito_em ASC',
    [usuarioId],
  );
  return rows;
}
