import { pool } from './pool.js';

/**
 * Executa `callback(client)` dentro de uma transação: COMMIT se tudo der certo,
 * ROLLBACK se qualquer query lançar erro (nada fica gravado pela metade).
 * Todas as queries da transação precisam usar o `client` recebido, não o pool.
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  let releaseError;

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      // Conexão em estado desconhecido: o pool deve descartá-la em vez de reutilizar.
      console.error('[db] falha no ROLLBACK:', rollbackError.message);
      releaseError = rollbackError;
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}
