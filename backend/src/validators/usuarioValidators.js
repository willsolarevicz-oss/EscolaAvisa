import { z } from 'zod';
import { ALL_ROLES, ROLES } from '../config/roles.js';
import {
  cpfSchema,
  emailSchema,
  listQueryShape,
  newPasswordSchema,
  personNameSchema,
  telefoneSchema,
} from './commonValidators.js';

export { setAtivoSchema } from './commonValidators.js';

const tipoUsuarioSchema = z.enum(ALL_ROLES, { error: 'Perfil inválido.' });

export const createUsuarioSchema = z
  .object({
    nome: personNameSchema,
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
  nome: personNameSchema,
  email: emailSchema,
  telefone: telefoneSchema,
  cpf: cpfSchema,
  // Recusa explicitamente em vez de ignorar: o cliente não deve achar que trocou o perfil.
  tipoUsuario: z.never({ error: 'O perfil não pode ser alterado depois da criação.' }).optional(),
});

export const resetSenhaSchema = z.object({
  senha: newPasswordSchema,
});

export const listUsuariosQuerySchema = z.object({
  ...listQueryShape,
  tipo: tipoUsuarioSchema.optional(),
});
