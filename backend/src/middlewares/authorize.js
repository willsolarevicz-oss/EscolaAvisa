import { ALL_ROLES } from '../config/roles.js';
import { AppError } from '../utils/AppError.js';

/**
 * Permite o acesso apenas aos perfis informados. Use sempre depois de `authenticate`.
 * Ex.: router.get('/x', authenticate, authorize(ROLES.ADMIN), handler)
 */
export function authorize(...allowedRoles) {
  // Falha na inicialização (e não em produção) se alguém digitar um perfil errado.
  const invalid = allowedRoles.filter((role) => !ALL_ROLES.includes(role));
  if (allowedRoles.length === 0 || invalid.length > 0) {
    throw new Error(`authorize(): perfis inválidos: ${invalid.join(', ') || '(nenhum)'}`);
  }

  return (req, _res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.tipo_usuario)) {
      return next(AppError.forbidden());
    }
    return next();
  };
}
