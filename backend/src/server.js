import { createApp } from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection, closePool } from './database/pool.js';

async function start() {
  // Falha cedo e com mensagem clara se o banco não estiver acessível.
  try {
    await checkDatabaseConnection();
  } catch (error) {
    console.error('[server] Não foi possível conectar ao PostgreSQL:', error.message);
    console.error('[server] Verifique DATABASE_URL em backend/.env e se o PostgreSQL está rodando.');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`[server] EscolaAvis API rodando em http://localhost:${env.port}/api (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} recebido, encerrando...`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
