import jwt from 'jsonwebtoken';
import * as usuarioRepository from '../repositories/usuarioRepository.js';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractBearerToken(header) {
  if (!header) return null;
  const [scheme, token, ...rest] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token || rest.length > 0) return null;
  return token;
}

/**
 * Exige um JWT válido e um usuário existente e ativo.
 * Em caso de sucesso, coloca o usuário (lido do banco, sem senha) em req.user.
 */
export async function authenticate(req, _res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    return next(AppError.unauthorized('Autenticação necessária. Faça login para continuar.'));
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(AppError.unauthorized('Sua sessão expirou. Faça login novamente.'));
    }
    return next(AppError.unauthorized('Sessão inválida. Faça login novamente.'));
  }

  // Evita erro do PostgreSQL ao comparar um "sub" que não é UUID.
  if (typeof payload.sub !== 'string' || !UUID_REGEX.test(payload.sub)) {
    return next(AppError.unauthorized('Sessão inválida. Faça login novamente.'));
  }

  try {
    const usuario = await usuarioRepository.findById(payload.sub);
    // Usuário removido ou desativado depois do login perde o acesso imediatamente.
    if (!usuario || !usuario.ativo) {
      return next(AppError.unauthorized('Sessão inválida. Faça login novamente.'));
    }

    // Usamos o perfil do BANCO (não o do token): se o perfil mudar, vale na hora.
    req.user = usuario;
    return next();
  } catch (error) {
    return next(error);
  }
}
