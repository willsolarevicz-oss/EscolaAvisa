import { z } from 'zod';
import { listQueryShape } from './commonValidators.js';

/** Trilha de auditoria: página, busca por quem fez e "só falhas" (status >= 400). */
export const listAuditoriaQuerySchema = z.object({
  page: listQueryShape.page,
  pageSize: listQueryShape.pageSize,
  busca: listQueryShape.busca,
  falhas: z
    .enum(['true', 'false'], { error: 'Use true ou false em falhas.' })
    .optional()
    .transform((value) => value === 'true'),
});
