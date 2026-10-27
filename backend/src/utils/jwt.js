import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';

/** Gera o token com o id (claim padrão "sub") e o tipo do usuário. */
export function signAccessToken(usuario) {
  return jwt.sign({ tipo_usuario: usuario.tipo_usuario }, env.jwtSecret, {
    algorithm: ALGORITHM,
    subject: usuario.id,
    expiresIn: env.jwtExpiresIn,
  });
}

/** Lança TokenExpiredError / JsonWebTokenError se o token for inválido. */
export function verifyAccessToken(token) {
  // Fixar o algoritmo impede ataques que trocam o "alg" do cabeçalho.
  return jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
}

/** Segundos até expirar, lidos do próprio token (útil para o frontend). */
export function getTokenExpiresIn(token) {
  const { exp, iat } = jwt.decode(token);
  return exp - iat;
}
