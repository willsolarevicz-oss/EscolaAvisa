import * as authService from '../services/authService.js';
import * as termosService from '../services/termosService.js';
import { toUsuarioResponse } from '../utils/serializers.js';

export async function login(req, res) {
  const result = await authService.login(req.body);
  // No login ainda não há req.user: informa à auditoria quem entrou.
  res.locals.auditoriaUsuarioId = result.user.id;
  // A tela decide se mostra o aceite da Política/Termos antes do sistema.
  result.user.termos = await termosService.situacao(result.user.id);
  res.status(200).json({ success: true, data: result });
}

export async function me(req, res) {
  // req.user já foi carregado do banco pelo middleware authenticate.
  const user = { ...toUsuarioResponse(req.user), termos: await termosService.situacao(req.user.id) };
  res.status(200).json({ success: true, data: { user } });
}

/** POST /api/me/termos/aceite — { versao } da Política/Termos que a pessoa leu. */
export async function aceitarTermos(req, res) {
  const termos = await termosService.aceitar(req.user.id, req.body.versao, req.ip ?? null);
  res.status(200).json({ success: true, message: 'Aceite registrado.', data: { termos } });
}
