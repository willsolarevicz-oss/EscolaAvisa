import { AppError } from '../utils/AppError.js';

function toValidationError(zodError) {
  const errors = zodError.issues.map((issue) => ({
    field: issue.path.join('.') || null,
    message: issue.message,
  }));
  return AppError.badRequest('Dados inválidos. Verifique os campos informados.', errors);
}

/**
 * Valida req.body com um schema zod e substitui pelo valor já normalizado
 * (ex.: e-mail com trim e minúsculas). Campos fora do schema são descartados.
 */
export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) return next(toValidationError(result.error));

    req.body = result.data;
    return next();
  };
}

/**
 * Valida a query string. O resultado vai para `req.validatedQuery`,
 * porque no Express 5 `req.query` é somente leitura.
 */
export function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) return next(toValidationError(result.error));

    req.validatedQuery = result.data;
    return next();
  };
}
