import { parseNota } from './notas';

/** Fração 0–1 da API → "67%". Sem base (null) → "—", nunca "0%". */
export function formatPercent(taxa) {
  return taxa === null || taxa === undefined ? '—' : `${Math.round(taxa * 100)}%`;
}

const hoje = () => new Date().toLocaleDateString('sv-SE');

/** Período padrão dos relatórios (igual ao do backend): 1º de janeiro até hoje. */
export function periodoPadrao() {
  return { inicio: `${hoje().slice(0, 4)}-01-01`, fim: hoje() };
}

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Período a partir da URL (?inicio=&fim=), caindo no padrão quando ausente ou inválido. */
export function periodoDaUrl(searchParams) {
  const padrao = periodoPadrao();
  const inicio = searchParams.get('inicio');
  const fim = searchParams.get('fim');
  return {
    inicio: DATA_RE.test(inicio ?? '') ? inicio : padrao.inicio,
    fim: DATA_RE.test(fim ?? '') ? fim : padrao.fim,
  };
}

/** Nota de corte digitada é válida? (mesma regra das notas: 0 a 10, uma casa; vazio não vale) */
export function corteValido(texto) {
  const valor = parseNota(texto);
  return valor !== null && !Number.isNaN(valor);
}
