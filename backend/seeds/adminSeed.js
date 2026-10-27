import { env } from '../src/config/env.js';
import { ROLES } from '../src/config/roles.js';
import { pool } from '../src/database/pool.js';
import { hashPassword } from '../src/utils/password.js';

// SENHA SOMENTE PARA DESENVOLVIMENTO LOCAL. Em produção, SEED_ADMIN_PASSWORD é obrigatória.
const DEV_ADMIN_PASSWORD = 'Admin@123';

export const ADMIN_SEED = Object.freeze({
  nome: 'Administrador EscolaAvis',
  email: 'admin@escolaavis.com',
});

function resolveAdminPassword() {
  const fromEnv = process.env.SEED_ADMIN_PASSWORD;
  if (fromEnv) return fromEnv;
  if (env.isProduction) {
    throw new Error('Defina SEED_ADMIN_PASSWORD para rodar o seed em produção.');
  }
  return DEV_ADMIN_PASSWORD;
}

/**
 * Cria o administrador inicial. Idempotente: se o e-mail já existir, não altera nada
 * (nem a senha), então pode ser executado várias vezes com segurança.
 * @returns {Promise<boolean>} true se criou, false se já existia
 */
export async function seedAdmin(client = pool) {
  const senhaHash = await hashPassword(resolveAdminPassword());
  const { rowCount } = await client.query(
    `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [ADMIN_SEED.nome, ADMIN_SEED.email, senhaHash, ROLES.ADMIN],
  );
  return rowCount === 1;
}
