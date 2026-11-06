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
    console.log(`[server] EscolaAvisa API rodando em http://localhost:${env.port}/api (${env.nodeEnv})`);
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

  // Falha que escapou de todo tratamento: registra com o mesmo prefixo dos erros da API.
  // Promise rejeitada só é registrada; exceção síncrona deixa o processo em estado incerto,
  // então encerra (o gerenciador de processos/hospedagem reinicia a API).
  process.on('unhandledRejection', (reason) => {
    console.error(`[erro] ${new Date().toISOString()} promise rejeitada sem tratamento`, reason);
  });
  process.on('uncaughtException', (error) => {
    console.error(`[erro] ${new Date().toISOString()} exceção não tratada; encerrando`, error);
    process.exit(1);
  });
}

start();
