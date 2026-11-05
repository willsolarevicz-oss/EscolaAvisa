import { z } from 'zod';

export const BIMESTRES = Object.freeze([1, 2, 3, 4]);

// Uma casa decimal: 7.5 ok, 7.25 não. Compara com tolerância por causa do ponto flutuante.
const umaCasaDecimal = (value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;

const valorSchema = z
  .number({ error: 'Nota inválida.' })
  .min(0, 'A nota deve estar entre 0 e 10.')
  .max(10, 'A nota deve estar entre 0 e 10.')
  .refine(umaCasaDecimal, 'Use no máximo uma casa decimal (ex.: 7,5).')
  // null = apagar a nota daquele bimestre.
  .nullable();

export const lancamentoSchema = z.object({
  notas: z
    .array(
      z.object({
        alunoId: z.uuid({ error: 'Aluno inválido.' }),
        bimestre: z
          .number({ error: 'Bimestre inválido.' })
          .int('Bimestre inválido.')
          .min(1, 'Bimestre deve ser de 1 a 4.')
          .max(4, 'Bimestre deve ser de 1 a 4.'),
        valor: valorSchema,
      }),
      { error: 'Envie a lista de notas.' },
    )
    .min(1, 'Nenhuma nota para salvar.')
    .max(1000, 'Lote muito grande.')
    .superRefine((notas, ctx) => {
      // A mesma célula (aluno + bimestre) não pode vir duas vezes no mesmo envio.
      const vistos = new Set();
      notas.forEach((nota, index) => {
        const chave = `${nota.alunoId}:${nota.bimestre}`;
        if (vistos.has(chave)) {
          ctx.addIssue({ code: 'custom', path: [index], message: 'Nota repetida para o mesmo aluno e bimestre.' });
        }
        vistos.add(chave);
      });
    }),
});
