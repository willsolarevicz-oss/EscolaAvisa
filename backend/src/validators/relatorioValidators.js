import { z } from 'zod';
import { umaCasaDecimal } from './notaValidators.js';

// Um ano cabe com folga; acima disso o relatório fica pesado e pouco útil.
export const MAX_DIAS_PERIODO = 366;

const hoje = () => new Date().toLocaleDateString('sv-SE');
const inicioDoAno = () => `${hoje().slice(0, 4)}-01-01`;

const dataSchema = (label) =>
  z.iso
    .date({ error: `${label} inválida (use AAAA-MM-DD).` })
    .refine((value) => value >= '2000-01-01' && value <= '2100-12-31', `${label} fora do intervalo permitido.`);

function diasEntre(inicio, fim) {
  return Math.round((Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000);
}

/** Período dos relatórios de avisos e ocorrências. Padrão: 1º de janeiro até hoje. */
export const periodoQuerySchema = z
  .object({
    inicio: dataSchema('Data inicial').optional(),
    fim: dataSchema('Data final').optional(),
  })
  .transform(({ inicio, fim }) => ({ inicio: inicio ?? inicioDoAno(), fim: fim ?? hoje() }))
  .superRefine((data, ctx) => {
    const dias = diasEntre(data.inicio, data.fim);
    if (dias < 0) {
      ctx.addIssue({ code: 'custom', path: ['fim'], message: 'A data final não pode ser antes da inicial.' });
    } else if (dias >= MAX_DIAS_PERIODO) {
      ctx.addIssue({ code: 'custom', path: ['fim'], message: 'O período pode ter no máximo 1 ano.' });
    }
  });

export const notasQuerySchema = z.object({
  turmaId: z.uuid({ error: 'Selecione a turma.' }),
  notaCorte: z.coerce
    .number({ error: 'Nota de corte inválida.' })
    .min(0, 'A nota de corte vai de 0 a 10.')
    .max(10, 'A nota de corte vai de 0 a 10.')
    .refine(umaCasaDecimal, 'Use no máximo uma casa decimal (ex.: 5,5).')
    .default(6),
});
