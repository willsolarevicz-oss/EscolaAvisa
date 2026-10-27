import { closePool } from '../src/database/pool.js';
import { ADMIN_SEED, seedAdmin } from './adminSeed.js';

// Ponto de entrada do `npm run seed`. Novos seeds devem ser chamados aqui, em ordem.
async function main() {
  const created = await seedAdmin();
  console.log(
    created
      ? `[seed] Administrador criado: ${ADMIN_SEED.email}`
      : `[seed] Administrador ${ADMIN_SEED.email} já existia; nada foi alterado.`,
  );
}

main()
  .catch((error) => {
    console.error('[seed] Falha ao executar seed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => closePool());
