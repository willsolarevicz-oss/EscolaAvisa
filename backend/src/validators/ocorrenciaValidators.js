import { z } from 'zod';
import { listQueryShape } from './commonValidators.js';

export { setAtivoSchema } from './commonValidators.js';

export const TIPOS_OCORRENCIA = Object.freeze(['DISCIPLINAR', 'ATRASO', 'SAUDE', 'ELOGIO', 'OUTRO']);
const tipoSchema = z.enum(TIPOS_OCORRENCIA, { error: 'Tipo de ocorrência inválido.' });

// Data local do servidor em AAAA-MM-DD (o formato sueco "sv-SE" é ISO).
const todayIso = () => new Date().toLocaleDateString('sv-SE');

export const ocorrenciaSchema = z.object({
  alunoId: z.uuid({ error: 'Selecione um aluno válido.' }),
  tipo: tipoSchema,
  descricao: z
    .string({ error: 'Descreva a ocorrência.' })
    .trim()
    .min(1, 'Descreva a ocorrência.')
    .max(5000, 'Descrição muito longa (máximo 5.000 caracteres).'),
  dataOcorrencia: z
    .iso.date({ error: 'Data inválida (use AAAA-MM-DD).' })
    .refine((value) => value >= '2000-01-01', 'Data inválida.')
    .refine((value) => value <= todayIso(), 'A data da ocorrência não pode estar no futuro.'),
});

export const listOcorrenciasQuerySchema = z.object({
  ...listQueryShape,
  tipo: tipoSchema.optional(),
  alunoId: z.uuid({ error: 'Aluno inválido.' }).optional(),
});

export const minhasOcorrenciasQuerySchema = z.object({
  page: listQueryShape.page,
  pageSize: listQueryShape.pageSize,
  pendentes: z
    .enum(['true', 'false'], { error: 'Use true ou false em pendentes.' })
    .optional()
    .transform((value) => value === 'true'),
});

export const meusAlunosQuerySchema = z.object({
  busca: listQueryShape.busca,
});
