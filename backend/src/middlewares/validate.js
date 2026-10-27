import { AppError } from '../utils/AppError.js';

/**
 * Valida req.body com um schema zod e substitui pelo valor já normalizado
 * (ex.: e-mail com trim e minúsculas). Campos fora do schema são descartados.
 */
export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body ?? {});

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || null,
        message: issue.message,
      }));
      return next(AppError.badRequest('Dados inválidos. Verifique os campos informados.', errors));
    }

    req.body = result.data;
    return next();
  };
}
