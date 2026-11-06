import { z } from 'zod';

/** Aceite da Política/Termos: a versão que a pessoa viu na tela. */
export const aceiteTermosSchema = z.object({
  versao: z
    .string({ error: 'Informe a versão dos documentos.' })
    .trim()
    .min(1, 'Informe a versão dos documentos.')
    .max(20, 'Versão inválida.'),
});
