import * as usuarioRepository from '../repositories/usuarioRepository.js';
import { AppError } from '../utils/AppError.js';
import { burnPasswordCheck, verifyPassword } from '../utils/password.js';
import { getTokenExpiresIn, signAccessToken } from '../utils/jwt.js';
import { toUsuarioResponse } from '../utils/serializers.js';

// Mesma mensagem para e-mail inexistente e senha errada: não revela quais e-mails existem.
const INVALID_CREDENTIALS = 'E-mail ou senha inválidos.';

export async function login({ email, senha }) {
  const usuario = await usuarioRepository.findByEmailWithPasswordHash(email);

  const passwordOk = usuario
    ? await verifyPassword(senha, usuario.senha_hash)
    : await burnPasswordCheck(senha);

  if (!usuario || !passwordOk) {
    throw AppError.unauthorized(INVALID_CREDENTIALS);
  }

  // Só informamos "inativo" depois da senha correta, para não vazar a existência da conta.
  if (!usuario.ativo) {
    throw AppError.forbidden('Seu acesso está desativado. Procure a administração da escola.');
  }

  const token = signAccessToken(usuario);

  return {
    token,
    tokenType: 'Bearer',
    expiresIn: getTokenExpiresIn(token),
    user: toUsuarioResponse(usuario),
  };
}
