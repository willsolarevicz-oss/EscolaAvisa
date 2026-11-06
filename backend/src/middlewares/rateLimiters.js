import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Limite GERAL da API por IP (todas as rotas em /api): segura abuso e robôs sem atrapalhar uso
 * normal (300/min por padrão; uma grade de notas salva em uma requisição só). Fábrica para os
 * testes poderem criar um limitador pequeno sem mexer no do app.
 */
export function createApiRateLimiter({ limit, windowMs }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Muitas requisições em pouco tempo. Aguarde um instante e tente novamente.',
    },
  });
}

export const apiRateLimiter = createApiRateLimiter({
  limit: env.apiRateLimitMax,
  windowMs: env.apiRateLimitWindowMinutes * 60 * 1000,
});

// Limita tentativas de login por IP para dificultar força bruta.
// Logins bem-sucedidos não contam, então um usuário legítimo não é bloqueado.
export const loginRateLimiter = rateLimit({
  windowMs: env.authRateLimitWindowMinutes * 60 * 1000,
  limit: env.authRateLimitMax,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
  },
});
