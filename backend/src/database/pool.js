import pg from 'pg';
import { env } from '../config/env.js';

// Retorna colunas DATE (ex.: data_nascimento) como string 'YYYY-MM-DD'.
// Sem isso o pg converte para Date no fuso local e o dia pode "voltar" um.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Erro em conexão ociosa não deve derrubar o processo; o pool descarta o client.
pool.on('error', (error) => {
  console.error('[db] erro inesperado em conexão ociosa:', error.message);
});

/**
 * Executa uma query parametrizada. Sempre passe valores em `params`
 * (nunca concatene strings no SQL) para evitar SQL Injection.
 */
export function query(text, params = []) {
  return pool.query(text, params);
}

export async function checkDatabaseConnection() {
  await pool.query('SELECT 1');
}

export function closePool() {
  return pool.end();
}
