import { env } from '../../src/config/env.js';
import { pool } from '../../src/database/pool.js';
import { runMigrations } from '../../src/database/migrate.js';
import { seedAdmin } from '../../seeds/adminSeed.js';
import { hashPassword } from '../../src/utils/password.js';

function assertTestDatabase() {
  const dbName = new URL(env.databaseUrl).pathname.slice(1);
  if (!env.isTest || !dbName.endsWith('_test')) {
    throw new Error(`Recusando limpar o banco "${dbName}": os testes só rodam em bancos *_test.`);
  }
}

/** Recria o schema do zero e aplica todas as migrations + seed (testa as migrations também). */
export async function resetDatabase() {
  assertTestDatabase();
  await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
  await pool.query('CREATE SCHEMA public');
  await runMigrations({ direction: 'up', log: () => {} });
  await seedAdmin();
}

export async function createUser({
  nome = 'Usuário Teste',
  email,
  senha = 'Senha@123',
  tipoUsuario = 'PROFESSOR',
  ativo = true,
}) {
  const senhaHash = await hashPassword(senha);
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, nome, email, tipo_usuario, ativo`,
    [nome, email, senhaHash, tipoUsuario, ativo],
  );
  return rows[0];
}

export { pool };
