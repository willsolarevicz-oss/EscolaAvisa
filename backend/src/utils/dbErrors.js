import { AppError } from './AppError.js';

/**
 * Converte violação de UNIQUE conhecida (código 23505 do PostgreSQL) em 409 com
 * mensagem e campo específicos. Outros erros são relançados sem alteração.
 * messagesByConstraint: { nome_da_constraint: { field, message } }
 */
export function rethrowUniqueAsConflict(error, messagesByConstraint) {
  const known = error.code === '23505' && messagesByConstraint[error.constraint];
  if (known) {
    throw new AppError(known.message, 409, [{ field: known.field, message: known.message }]);
  }
  throw error;
}
