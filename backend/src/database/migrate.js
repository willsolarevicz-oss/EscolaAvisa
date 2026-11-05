import path from 'node:path';
import readline from 'node:readline/promises';
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

/** Nome do banco da URL (sem usuário/senha), para a mensagem de confirmação. */
function nomeDoBanco(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return `${url.pathname.slice(1)} em ${url.hostname}`;
  } catch {
    // URL fora do formato esperado: a confirmação continua valendo, só sem o nome.
    return 'configurado no .env';
  }
}

/**
 * Desfazer migration pode APAGAR tabelas e dados. Pede confirmação explícita:
 * no terminal, digitando "sim"; em script/CI (sem terminal), só com --yes.
 */
async function confirmarDown(count) {
  const quantas = count ?? 1;
  const alvo = `${quantas} migration(s) no banco ${nomeDoBanco(env.databaseUrl)}`;
  if (!process.stdin.isTTY) {
    throw new Error(`Desfazer ${alvo} exige confirmação. Rode de novo com --yes.`);
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const resposta = await rl.question(
      `[migrate] Isso vai DESFAZER ${alvo} (pode apagar tabelas e dados). Digite "sim" para continuar: `,
    );
    return resposta.trim().toLowerCase() === 'sim';
  } finally {
    rl.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const yes = args.includes('--yes');
  const [directionArg, countArg] = args.filter((arg) => arg !== '--yes');
  const direction = directionArg === 'down' ? 'down' : 'up';
  const count = countArg ? Number(countArg) : undefined;
  if (countArg && (!Number.isInteger(count) || count <= 0)) {
    throw new Error('Quantidade de migrations inválida');
  }

  if (direction === 'down' && !yes && !(await confirmarDown(count))) {
    console.log('[migrate] Cancelado. Nada foi desfeito.');
    return;
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
