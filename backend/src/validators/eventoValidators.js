import { z } from 'zod';
import { optionalTextSchema } from './commonValidators.js';

export const TIPOS_EVENTO = Object.freeze(['PROVA', 'REUNIAO', 'RECESSO', 'EVENTO', 'OUTRO']);

// Um evento longo (ex.: recesso de julho) cabe com folga; acima disso provavelmente é erro de digitação.
export const MAX_DIAS_EVENTO = 90;

const dataSchema = (label) =>
  z.iso
    .date({ error: `${label} inválida (use AAAA-MM-DD).` })
    .refine((value) => value >= '2000-01-01' && value <= '2100-12-31', `${label} fora do intervalo permitido.`);

/** Diferença em dias entre duas datas AAAA-MM-DD (UTC: sem efeito de horário de verão). */
function diasEntre(inicio, fim) {
  return Math.round((Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000);
}

export const eventoSchema = z
  .object({
    titulo: z
      .string({ error: 'Informe o título.' })
      .trim()
      .min(3, 'O título deve ter pelo menos 3 caracteres.')
      .max(150, 'Título muito longo (máximo 150 caracteres).'),
    descricao: optionalTextSchema(2000, 'Descrição'),
    tipo: z.enum(TIPOS_EVENTO, { error: 'Tipo de evento inválido.' }),
    dataInicio: dataSchema('Data de início'),
    // Sem data de fim = evento de um dia só.
    dataFim: dataSchema('Data de término').nullish(),
    turmaId: z
      .uuid({ error: 'Selecione uma turma válida.' })
      .nullish()
      .transform((value) => value ?? null),
  })
  .transform((data) => ({ ...data, dataFim: data.dataFim ?? data.dataInicio }))
  .superRefine((data, ctx) => {
    const dias = diasEntre(data.dataInicio, data.dataFim);
    if (dias < 0) {
      ctx.addIssue({ code: 'custom', path: ['dataFim'], message: 'O término não pode ser antes do início.' });
    } else if (dias >= MAX_DIAS_EVENTO) {
      ctx.addIssue({
        code: 'custom',
        path: ['dataFim'],
        message: `Um evento pode durar no máximo ${MAX_DIAS_EVENTO} dias.`,
      });
    }
  });

export const calendarioQuerySchema = z.object({
  mes: z
    .string({ error: 'Mês inválido (use AAAA-MM).' })
    .regex(/^(\d{4})-(0[1-9]|1[0-2])$/, 'Mês inválido (use AAAA-MM).')
    .refine((value) => value >= '2000-01' && value <= '2100-12', 'Mês fora do intervalo permitido.'),
});

export const proximosQuerySchema = z.object({
  limite: z.coerce
    .number({ error: 'Limite inválido.' })
    .int('Limite inválido.')
    .min(1, 'Limite inválido.')
    .max(20, 'Limite máximo: 20.')
    .default(5),
});
