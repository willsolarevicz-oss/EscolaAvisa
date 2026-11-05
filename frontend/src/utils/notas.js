export const BIMESTRES = [1, 2, 3, 4];

/** 7.5 → "7,5"; null → "—". */
export function formatNota(valor) {
  return valor === null || valor === undefined ? '—' : valor.toFixed(1).replace('.', ',');
}

/**
 * Converte o texto digitado na grade em nota.
 * '' → null (sem nota); "7,5"/"7.5"/"10" → número; qualquer outra coisa → NaN (inválido).
 * Regra igual à do backend: 0 a 10, no máximo uma casa decimal.
 */
export function parseNota(texto) {
  const valor = texto.trim();
  if (valor === '') return null;
  if (!/^\d{1,2}([.,]\d)?$/.test(valor)) return Number.NaN;
  const numero = Number(valor.replace(',', '.'));
  return numero >= 0 && numero <= 10 ? numero : Number.NaN;
}

/** Média simples dos bimestres preenchidos, com uma casa decimal (mesma conta do backend). */
export function calcularMedia(notas) {
  const valores = BIMESTRES.map((b) => notas[b]).filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (valores.length === 0) return null;
  return Math.round((valores.reduce((total, v) => total + v, 0) / valores.length) * 10) / 10;
}

/** Cor da média: abaixo de 5 vermelho, de 5 a 6,9 amarelo, 7 ou mais verde (só visual). */
export function mediaTone(media) {
  if (media === null) return 'neutral';
  if (media < 5) return 'danger';
  if (media < 7) return 'warning';
  return 'success';
}
