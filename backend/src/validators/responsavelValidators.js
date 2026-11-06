import { z } from 'zod';
import { listQueryShape } from './commonValidators.js';

/** Listagem de responsáveis: busca, situação, página e "sem aluno vinculado". */
export const listResponsaveisQuerySchema = z.object({
  ...listQueryShape,
  semAluno: z
    .enum(['true', 'false'], { error: 'Use true ou false em semAluno.' })
    .optional()
    .transform((value) => value === 'true'),
});
