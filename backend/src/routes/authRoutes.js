import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { loginRateLimiter } from '../middlewares/rateLimiters.js';
import { validateBody } from '../middlewares/validate.js';
import { loginSchema } from '../validators/authValidators.js';

export const authRoutes = Router();

authRoutes.post('/login', loginRateLimiter, validateBody(loginSchema), authController.login);
authRoutes.get('/me', authenticate, authController.me);
