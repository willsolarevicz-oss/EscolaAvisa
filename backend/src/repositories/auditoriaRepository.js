import { pool } from '../database/pool.js';
import { buscaSemAcento, containsPattern } from '../database/sqlHelpers.js';

export async function registrar({ usuarioId, metodo, rota, recursoId, status, ip }) {
  await pool.query(
    `INSERT INTO auditoria (usuario_id, metodo, rota, recurso_id, status, ip)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [usuarioId, metodo, rota, recursoId, status, ip],
  );
}

/**
 * Trilha de auditoria, mais recente primeiro.
 * Filtros: busca (nome/e-mail de quem fez, sem acento), falhas (status >= 400).
 */
export async function list({ page, pageSize, busca, falhas }) {
  const conditions = [];
  const params = [];
  if (busca) {
    params.push(containsPattern(busca));
    conditions.push(buscaSemAcento(['u.nome', 'u.email'], `$${params.length}`));
  }
  if (falhas) conditions.push('a.status >= 400');
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const from = 'FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id';

  const [countResult, pageResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total ${from} ${where}`, params),
    pool.query(
      `SELECT a.id, a.metodo, a.rota, a.recurso_id, a.status, a.ip, a.criado_em,
              a.usuario_id, u.nome AS usuario_nome, u.email AS usuario_email
       ${from} ${where}
       ORDER BY a.criado_em DESC, a.id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);
  return { rows: pageResult.rows, total: countResult.rows[0].total };
}
