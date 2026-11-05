import { z } from 'zod';
import { listQueryShape } from './commonValidators.js';

export const CANAIS = Object.freeze(['SECRETARIA', 'PROFESSOR']);

const conteudoSchema = z
  .string({ error: 'Escreva a mensagem.' })
  .trim()
  .min(1, 'Escreva a mensagem.')
  .max(5000, 'Mensagem muito longa (máximo 5.000 caracteres).');

const optionalUuid = (message) => z.uuid({ error: message }).nullish().transform((value) => value ?? null);

/**
 * Nova conversa. Os campos de "com quem" dependem do perfil (regras no service):
 * - RESPONSAVEL: canal (+ professorId se canal = PROFESSOR);
 * - ADMIN / PROFESSOR: responsavelId.
 */
export const novaConversaSchema = z.object({
  alunoId: z.uuid({ error: 'Selecione o aluno.' }),
  assunto: z
    .string({ error: 'Informe o assunto.' })
    .trim()
    .min(3, 'O assunto deve ter pelo menos 3 caracteres.')
    .max(150, 'Assunto muito longo (máximo 150 caracteres).'),
  mensagem: conteudoSchema,
  canal: z.enum(CANAIS, { error: 'Escolha com quem quer falar.' }).optional(),
  professorId: optionalUuid('Selecione um professor válido.'),
  responsavelId: optionalUuid('Selecione um responsável válido.'),
});

export const mensagemSchema = z.object({ conteudo: conteudoSchema });

export const listConversasQuerySchema = z.object({
  page: listQueryShape.page,
  pageSize: listQueryShape.pageSize,
  naoLidas: z
    .enum(['true', 'false'], { error: 'Use true ou false em naoLidas.' })
    .optional()
    .transform((value) => value === 'true'),
});

export const contatosQuerySchema = z.object({
  alunoId: z.uuid({ error: 'Aluno inválido.' }).optional(),
});
