import { z } from 'zod';
import { listQueryShape, personNameSchema } from './commonValidators.js';

export { setAtivoSchema } from './commonValidators.js';

// Data local do servidor em AAAA-MM-DD (o formato sueco "sv-SE" é exatamente ISO).
const todayIso = () => new Date().toLocaleDateString('sv-SE');

const dataNascimentoSchema = z
  .iso.date({ error: 'Data de nascimento inválida (use AAAA-MM-DD).' })
  // Comparar strings AAAA-MM-DD funciona porque a ordem alfabética é a cronológica.
  .refine((value) => value >= '1900-01-01', 'Data de nascimento inválida.')
  .refine((value) => value <= todayIso(), 'A data de nascimento não pode estar no futuro.');

// Maiúsculas: evita "mat-01" e "MAT-01" como matrículas diferentes.
const matriculaSchema = z
  .string({ error: 'Informe a matrícula.' })
  .trim()
  .toUpperCase()
  .min(1, 'Informe a matrícula.')
  .max(30, 'Matrícula muito longa (máximo 30 caracteres).')
  .regex(/^[A-Z0-9./-]+$/, 'Use apenas letras, números, ponto, barra e hífen na matrícula.');

export const alunoSchema = z.object({
  nome: personNameSchema,
  dataNascimento: dataNascimentoSchema,
  matricula: matriculaSchema,
});

export const listAlunosQuerySchema = z.object(listQueryShape);

const parentescoSchema = z
  .string({ error: 'Informe o parentesco.' })
  .trim()
  .min(1, 'Informe o parentesco.')
  .max(50, 'Parentesco muito longo (máximo 50 caracteres).');

const booleanField = (label) => z.boolean({ error: `Informe "${label}" como true ou false.` });

export const createVinculoSchema = z.object({
  usuarioId: z.uuid({ error: 'Selecione um responsável válido.' }),
  parentesco: parentescoSchema,
  responsavelPrincipal: booleanField('responsavelPrincipal').default(false),
  autorizadoReceberComunicacoes: booleanField('autorizadoReceberComunicacoes').default(true),
});

export const updateVinculoSchema = z.object({
  parentesco: parentescoSchema,
  responsavelPrincipal: booleanField('responsavelPrincipal'),
  autorizadoReceberComunicacoes: booleanField('autorizadoReceberComunicacoes'),
});
