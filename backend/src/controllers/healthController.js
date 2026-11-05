import { env } from '../config/env.js';
import { checkDatabaseConnection } from '../database/pool.js';

export async function health(_req, res) {
  const timestamp = new Date().toISOString();

  try {
    await checkDatabaseConnection();
    res.status(200).json({
      success: true,
      data: { api: 'ok', database: 'ok', timestamp },
    });
  } catch (error) {
    // Detalhes do erro (host, usuário etc.) ficam só no log do servidor.
    if (!env.isTest) console.error('[health] banco indisponível:', error.message);
    res.status(503).json({
      success: false,
      message: 'API em funcionamento, mas o banco de dados está indisponível.',
      data: { api: 'ok', database: 'indisponivel', timestamp },
    });
  }
}
