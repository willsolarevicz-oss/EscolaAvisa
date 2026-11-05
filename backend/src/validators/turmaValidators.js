import { z } from 'zod';
import { TURNOS } from '../config/turnos.js';
import { listQueryShape, optionalTextSchema } from './commonValidators.js';

export { setAtivoSchema } from './commonValidators.js';

const turnoSchema = z.enum(TURNOS, { error: 'Turno inválido.' });

export const turmaSchema = z.object({
  nome: z
    .string({ error: 'Informe o nome da turma.' })
    .trim()
    .min(1, 'Informe o nome da turma.')
    .max(100, 'Nome muito longo (máximo 100 caracteres).'),
  anoLetivo: z
    .number({ error: 'Informe o ano letivo.' })
    .int('Ano letivo inválido.')
    .min(2000, 'Ano letivo deve estar entre 2000 e 2100.')
    .max(2100, 'Ano letivo deve estar entre 2000 e 2100.'),
  turno: turnoSchema,
  descricao: optionalTextSchema(500, 'Descrição'),
});

export const listTurmasQuerySchema = z.object({
  ...listQueryShape,
  anoLetivo: z.coerce
    .number({ error: 'Ano letivo inválido.' })
    .int('Ano letivo inválido.')
    .min(2000, 'Ano letivo inválido.')
    .max(2100, 'Ano letivo inválido.')
    .optional(),
  turno: turnoSchema.optional(),
});

export const matriculaSchema = z.object({
  alunoId: z.uuid({ error: 'Selecione um aluno válido.' }),
  // Confirma a transferência quando o aluno já está em outra turma do mesmo ano.
  transferir: z.boolean({ error: 'Informe "transferir" como true ou false.' }).default(false),
});

export const atribuicaoSchema = z.object({
  professorId: z.uuid({ error: 'Selecione um professor válido.' }),
  disciplinaId: z.uuid({ error: 'Selecione uma disciplina válida.' }),
});
