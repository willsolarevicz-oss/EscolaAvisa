import { z } from 'zod';
import { isValidCpf } from '../utils/cpf.js';

export const emailSchema = z
  .string({ error: 'Informe o e-mail.' })
  .trim()
  .toLowerCase()
  .min(1, 'Informe o e-mail.')
  .max(255, 'E-mail muito longo.')
  .pipe(z.email({ error: 'Informe um e-mail válido.' }));

// 72 bytes é o máximo que o bcrypt considera; acima disso o resto seria ignorado.
const fitsBcrypt = (value) => Buffer.byteLength(value, 'utf8') <= 72;

/** Senha no login: só exige que exista (a política vale para senhas novas). */
export const loginPasswordSchema = z
  .string({ error: 'Informe a senha.' })
  .min(1, 'Informe a senha.')
  .refine(fitsBcrypt, 'Senha muito longa.');

/** Política para senhas novas. Sem trim: espaços podem fazer parte da senha. */
export const newPasswordSchema = z
  .string({ error: 'Informe a senha.' })
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .refine(fitsBcrypt, 'Senha muito longa.')
  .refine((value) => /\p{L}/u.test(value), 'A senha deve conter pelo menos uma letra.')
  .refine((value) => /\d/.test(value), 'A senha deve conter pelo menos um número.');

/**
 * Campo opcional só de dígitos (aceita máscara: "(11) 99999-8888" vira "11999998888").
 * Vazio/ausente vira null. Texto sem nenhum dígito é rejeitado, não ignorado.
 */
function optionalDigits(isValid, message) {
  return z
    .string({ error: message })
    .trim()
    .nullish()
    .transform((value) => (value ? value.replace(/\D/g, '') : null))
    .refine((value) => value === null || isValid(value), message);
}

export const telefoneSchema = optionalDigits(
  (value) => /^\d{10,13}$/.test(value),
  'Telefone inválido. Informe DDD + número.',
);

export const cpfSchema = optionalDigits(isValidCpf, 'CPF inválido.');
