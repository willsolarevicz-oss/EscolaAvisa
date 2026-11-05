import { z } from 'zod';
import { isValidCpf } from '../utils/cpf.js';

export const personNameSchema = z
  .string({ error: 'Informe o nome.' })
  .trim()
  .min(2, 'O nome deve ter pelo menos 2 caracteres.')
  .max(150, 'Nome muito longo (máximo 150 caracteres).');

/** Campos de query comuns às listagens paginadas (`{ items, pagination }`). */
export const listQueryShape = {
  page: z.coerce
    .number({ error: 'Página inválida.' })
    .int('Página inválida.')
    .min(1, 'Página inválida.')
    .default(1),
  pageSize: z.coerce
    .number({ error: 'Tamanho de página inválido.' })
    .int('Tamanho de página inválido.')
    .min(1, 'Tamanho de página inválido.')
    .max(100, 'Tamanho de página máximo: 100.')
    .default(20),
  busca: z
    .string({ error: 'Busca inválida.' })
    .trim()
    .max(100, 'Busca muito longa.')
    .optional()
    .transform((value) => value || undefined),
  ativo: z
    .enum(['true', 'false'], { error: 'Situação inválida (use true ou false).' })
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
};

/** Texto livre opcional (ex.: descrição). Vazio vira null. */
export function optionalTextSchema(max, label = 'Texto') {
  return z
    .string({ error: `${label} inválido(a).` })
    .trim()
    .max(max, `${label} muito longo(a) (máximo ${max} caracteres).`)
    .nullish()
    .transform((value) => value || null);
}

export const setAtivoSchema = z.object({
  ativo: z.boolean({ error: 'Informe "ativo" como true ou false.' }),
});

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
