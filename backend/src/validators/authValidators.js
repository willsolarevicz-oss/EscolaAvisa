import { z } from 'zod';
import { emailSchema, loginPasswordSchema } from './commonValidators.js';

export const loginSchema = z.object({
  email: emailSchema,
  senha: loginPasswordSchema,
});
