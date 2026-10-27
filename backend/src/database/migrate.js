import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runner } from 'node-pg-migrate';
import { env } from '../config/env.js';

export const MIGRATIONS_DIR = path.join(env.backendRoot, 'migrations');

/**
 * Executa as migrations usando a mesma configuração da aplicação (backend/.env).
 * Usado pelo `npm run migrate` e pelos testes.
 */
export function runMigrations({ direction = 'up', count, databaseUrl = env.databaseUrl, log } = {}) {
  return runner({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    direction,
    count: count ?? (direction === 'up' ? Infinity : 1),
    migrationsTable: 'pgmigrations',
    // Cada migration roda em transação própria: se falhar, nada fica pela metade.
    singleTransaction: false,
    checkOrder: true,
    log: log ?? ((message) => console.log(message)),
  });
}

async function main() {
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const countArg = process.argv[3];
  const count = countArg ? Number(countArg) : undefined;
  if (countArg && (!Number.isInteger(count) || count <= 0)) {
    throw new Error('Quantidade de migrations inválida');
  }

  const executed = await runMigrations({ direction, count });
  if (executed.length === 0) {
    console.log(`[migrate] Nenhuma migration pendente (${direction}).`);
  } else {
    console.log(`[migrate] ${executed.length} migration(s) executada(s) (${direction}):`);
    executed.forEach((migration) => console.log(`  - ${migration.name}`));
  }
}

// Só executa o CLI quando chamado diretamente (não quando importado pelos testes).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[migrate] Falha ao executar migrations:', error.message);
    process.exitCode = 1;
  });
}
