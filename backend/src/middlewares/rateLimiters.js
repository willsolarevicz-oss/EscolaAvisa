import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

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
