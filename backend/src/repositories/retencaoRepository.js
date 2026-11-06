import { query } from '../database/pool.js';

/** Registros da trilha de auditoria anteriores à data limite (o que a limpeza apagaria). */
export async function contarAuditoriaAntesDe(limite, db = { query }) {
  const { rows } = await db.query(
    'SELECT COUNT(*)::int AS total, MIN(criado_em) AS mais_antigo FROM auditoria WHERE criado_em < $1',
    [limite],
  );
  return { total: rows[0].total, maisAntigo: rows[0].mais_antigo };
}

export async function apagarAuditoriaAntesDe(limite, db = { query }) {
  const { rowCount } = await db.query('DELETE FROM auditoria WHERE criado_em < $1', [limite]);
  return rowCount;
}

export const ROTA_LIMPEZA_AUDITORIA = 'script:retencao/auditoria';

/**
 * A própria limpeza fica registrada na trilha (é uma eliminação de dados pessoais).
 * Sem usuário: quem rodou é o operador do servidor; a quantidade fica no log da rotina.
 */
export async function registrarLimpezaNaAuditoria(db = { query }) {
  await db.query(
    `INSERT INTO auditoria (usuario_id, metodo, rota, recurso_id, status, ip)
     VALUES (NULL, 'DELETE', $1, NULL, 200, NULL)`,
    [ROTA_LIMPEZA_AUDITORIA],
  );
}
