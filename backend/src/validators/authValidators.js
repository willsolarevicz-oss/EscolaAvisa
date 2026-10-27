import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ error: 'Informe o e-mail.' })
    .trim()
    .toLowerCase()
    .min(1, 'Informe o e-mail.')
    .max(255, 'E-mail muito longo.')
    .pipe(z.email({ error: 'Informe um e-mail válido.' })),
  // Sem trim: espaços podem fazer parte da senha.
  // Limite de 72 bytes é o máximo que o bcrypt considera; acima disso seria ignorado.
  senha: z
    .string({ error: 'Informe a senha.' })
    .min(1, 'Informe a senha.')
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Senha muito longa.'),
});
