import { z } from 'zod';
import { listQueryShape } from './commonValidators.js';

export { setAtivoSchema } from './commonValidators.js';

export const PUBLICOS = Object.freeze(['TODOS', 'TURMA', 'ALUNO']);
const publicoSchema = z.enum(PUBLICOS, { error: 'Público inválido.' });

const optionalUuid = (message) => z.uuid({ error: message }).nullish().transform((value) => value ?? null);

export const avisoSchema = z
  .object({
    titulo: z
      .string({ error: 'Informe o título.' })
      .trim()
      .min(3, 'O título deve ter pelo menos 3 caracteres.')
      .max(150, 'Título muito longo (máximo 150 caracteres).'),
    // Sem trim interno: quebras de linha fazem parte do texto; só as pontas são aparadas.
    conteudo: z
      .string({ error: 'Escreva o conteúdo do aviso.' })
      .trim()
      .min(1, 'Escreva o conteúdo do aviso.')
      .max(10000, 'Conteúdo muito longo (máximo 10.000 caracteres).'),
    publico: publicoSchema,
    turmaId: optionalUuid('Selecione uma turma válida.'),
    alunoId: optionalUuid('Selecione um aluno válido.'),
  })
  .superRefine((data, ctx) => {
    // Mesma regra da CHECK avisos_publico_alvo_check, com mensagem por campo.
    const issue = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (data.publico === 'TURMA' && !data.turmaId) issue('turmaId', 'Selecione a turma.');
    if (data.publico === 'ALUNO' && !data.alunoId) issue('alunoId', 'Selecione o aluno.');
    if (data.publico !== 'TURMA' && data.turmaId) issue('turmaId', 'Turma só se aplica ao público "Turma".');
    if (data.publico !== 'ALUNO' && data.alunoId) issue('alunoId', 'Aluno só se aplica ao público "Aluno".');
  });

export const listAvisosQuerySchema = z.object({
  ...listQueryShape,
  publico: publicoSchema.optional(),
});

export const meusAvisosQuerySchema = z.object({
  page: listQueryShape.page,
  pageSize: listQueryShape.pageSize,
  naoLidos: z
    .enum(['true', 'false'], { error: 'Use true ou false em naoLidos.' })
    .optional()
    .transform((value) => value === 'true'),
});
