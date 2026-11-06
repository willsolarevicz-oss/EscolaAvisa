import * as authService from '../services/authService.js';
import { toUsuarioResponse } from '../utils/serializers.js';

export async function login(req, res) {
  const result = await authService.login(req.body);
  // No login ainda não há req.user: informa à auditoria quem entrou.
  res.locals.auditoriaUsuarioId = result.user.id;
  res.status(200).json({ success: true, data: result });
}

export function me(req, res) {
  // req.user já foi carregado do banco pelo middleware authenticate.
  res.status(200).json({ success: true, data: { user: toUsuarioResponse(req.user) } });
}
