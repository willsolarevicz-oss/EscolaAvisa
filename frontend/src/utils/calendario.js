// Datas do calendário são strings 'AAAA-MM-DD' / 'AAAA-MM' (sem fuso horário).
// As contas usam Date em UTC só para descobrir dia da semana e quantidade de dias.

const TIPOS_EVENTO = {
  PROVA: { label: 'Prova', tone: 'danger' },
  REUNIAO: { label: 'Reunião', tone: 'primary' },
  RECESSO: { label: 'Recesso', tone: 'success' },
  EVENTO: { label: 'Evento', tone: 'warning' },
  OUTRO: { label: 'Outro', tone: 'neutral' },
};

export function tipoEvento(tipo) {
  return TIPOS_EVENTO[tipo] ?? { label: tipo, tone: 'neutral' };
}

export const TIPO_EVENTO_OPTIONS = Object.entries(TIPOS_EVENTO).map(([value, { label }]) => ({ value, label }));

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MES_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isMesValido(value) {
  return MES_RE.test(value ?? '') && value >= '2000-01' && value <= '2100-12';
}

/** Mês atual (horário local) em 'AAAA-MM'. */
export function mesAtual() {
  return new Date().toLocaleDateString('sv-SE').slice(0, 7);
}

/** '2026-11' + 1 → '2026-12'; '2026-01' - 1 → '2025-12'. */
export function somarMeses(mes, delta) {
  const [ano, m] = mes.split('-').map(Number);
  const date = new Date(Date.UTC(ano, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** '2026-11' → 'novembro de 2026'. */
export function nomeDoMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(ano, m - 1, 1)),
  );
}

/**
 * Semanas do mês (domingo a sábado) para a grade.
 * Dias de fora do mês entram como `null` (células vazias).
 */
export function semanasDoMes(mes) {
  const [ano, m] = mes.split('-').map(Number);
  const primeiroDiaSemana = new Date(Date.UTC(ano, m - 1, 1)).getUTCDay();
  const totalDias = new Date(Date.UTC(ano, m, 0)).getUTCDate();

  const celulas = Array(primeiroDiaSemana).fill(null);
  for (let dia = 1; dia <= totalDias; dia += 1) {
    celulas.push({ dia, data: `${mes}-${String(dia).padStart(2, '0')}` });
  }
  while (celulas.length % 7 !== 0) celulas.push(null);

  const semanas = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
  return semanas;
}

/** Evento acontece neste dia? (vale para eventos de vários dias) */
export function eventoNoDia(evento, data) {
  return evento.dataInicio <= data && evento.dataFim >= data;
}

/** "10/11" ou "28/10 a 03/11" (sem o ano: o calendário já mostra o mês). */
export function periodoCurto(evento) {
  const curta = (data) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;
  return evento.dataInicio === evento.dataFim
    ? curta(evento.dataInicio)
    : `${curta(evento.dataInicio)} a ${curta(evento.dataFim)}`;
}
