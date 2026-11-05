import { z } from 'zod';
import { ALL_ROLES, ROLES } from '../config/roles.js';
import { cpfSchema, emailSchema, newPasswordSchema, telefoneSchema } from './commonValidators.js';

const nomeSchema = z
  .string({ error: 'Informe o nome.' })
  .trim()
  .min(2, 'O nome deve ter pelo menos 2 caracteres.')
  .max(150, 'Nome muito longo (máximo 150 caracteres).');

const tipoUsuarioSchema = z.enum(ALL_ROLES, { error: 'Perfil inválido.' });

export const createUsuarioSchema = z
  .object({
    nome: nomeSchema,
    email: emailSchema,
    senha: newPasswordSchema,
    tipoUsuario: tipoUsuarioSchema,
    telefone: telefoneSchema,
    cpf: cpfSchema,
  })
  .superRefine((data, ctx) => {
    // Telefone/CPF ficam na tabela responsaveis: não fazem sentido para outros perfis.
    if (data.tipoUsuario === ROLES.RESPONSAVEL) return;
    for (const field of ['telefone', 'cpf']) {
      if (data[field] !== null) {
        ctx.addIssue({ code: 'custom', path: [field], message: 'Este campo só se aplica a responsáveis.' });
      }
    }
  });

export const updateUsuarioSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  telefone: telefoneSchema,
  cpf: cpfSchema,
  // Recusa explicitamente em vez de ignorar: o cliente não deve achar que trocou o perfil.
  tipoUsuario: z.never({ error: 'O perfil não pode ser alterado depois da criação.' }).optional(),
});

export const setAtivoSchema = z.object({
  ativo: z.boolean({ error: 'Informe "ativo" como true ou false.' }),
});

export const resetSenhaSchema = z.object({
  senha: newPasswordSchema,
});

export const listUsuariosQuerySchema = z.object({
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
  tipo: tipoUsuarioSchema.optional(),
  ativo: z
    .enum(['true', 'false'], { error: 'Situação inválida (use true ou false).' })
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});
