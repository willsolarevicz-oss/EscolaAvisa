import { z } from 'zod';
import { listQueryShape, optionalTextSchema } from './commonValidators.js';

export { setAtivoSchema } from './commonValidators.js';

export const disciplinaSchema = z.object({
  nome: z
    .string({ error: 'Informe o nome da disciplina.' })
    .trim()
    .min(2, 'O nome deve ter pelo menos 2 caracteres.')
    .max(100, 'Nome muito longo (máximo 100 caracteres).'),
  descricao: optionalTextSchema(500, 'Descrição'),
});

export const listDisciplinasQuerySchema = z.object(listQueryShape);
