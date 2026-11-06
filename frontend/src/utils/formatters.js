const ROLE_LABELS = {
  ADMIN: 'Administrador',
  PROFESSOR: 'Professor',
  RESPONSAVEL: 'Responsável',
};

export function roleLabel(tipoUsuario) {
  return ROLE_LABELS[tipoUsuario] ?? tipoUsuario;
}

/** Opções de perfil para selects, na ordem de exibição. */
export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

const TURNO_LABELS = {
  MATUTINO: 'Matutino',
  VESPERTINO: 'Vespertino',
  NOTURNO: 'Noturno',
  INTEGRAL: 'Integral',
};

export function turnoLabel(turno) {
  return TURNO_LABELS[turno] ?? turno;
}

export const TURNO_OPTIONS = Object.entries(TURNO_LABELS).map(([value, label]) => ({ value, label }));

/** Anos para filtros/seleção: próximo, atual e dois anteriores (ordem decrescente). */
export function anoLetivoOptions() {
  const atual = new Date().getFullYear();
  return [atual + 1, atual, atual - 1, atual - 2].map((ano) => ({ value: String(ano), label: String(ano) }));
}

/** Público de um aviso em texto: "Todos os responsáveis", "Turma 6º Ano A", "Responsáveis de Lara". */
export function avisoPublicoLabel(aviso) {
  if (aviso.publico === 'TURMA') return `Turma ${aviso.turma?.nome ?? aviso.turmaNome ?? ''}`.trim();
  if (aviso.publico === 'ALUNO') return `Responsáveis de ${aviso.aluno?.nome ?? aviso.alunoNome ?? ''}`.trim();
  return 'Todos os responsáveis';
}

export const PUBLICO_OPTIONS = [
  { value: 'TODOS', label: 'Todos os responsáveis' },
  { value: 'TURMA', label: 'Uma turma' },
  { value: 'ALUNO', label: 'Um aluno' },
];

const TIPOS_OCORRENCIA = {
  DISCIPLINAR: { label: 'Disciplinar', tone: 'danger' },
  ATRASO: { label: 'Atraso', tone: 'warning' },
  SAUDE: { label: 'Saúde', tone: 'primary' },
  ELOGIO: { label: 'Elogio', tone: 'success' },
  OUTRO: { label: 'Outro', tone: 'neutral' },
};

export function tipoOcorrencia(tipo) {
  return TIPOS_OCORRENCIA[tipo] ?? { label: tipo, tone: 'neutral' };
}

/** Texto da barra de progresso de ciência (ReadProgress). */
export const VERBO_CIENCIA = { um: 'deu ciência', varios: 'deram ciência' };

export const TIPO_OCORRENCIA_OPTIONS = Object.entries(TIPOS_OCORRENCIA).map(([value, { label }]) => ({ value, label }));

/** Data e hora curtas: "04/11/2026 19:30". */
export function formatDateTime(value) {
  return formatDate(value, { dateStyle: 'short', timeStyle: 'short' });
}

/** Filtro de situação usado nas listagens (valor vai para ?ativo=). */
export const ATIVO_FILTER_OPTIONS = [
  { value: '', label: 'Todas as situações' },
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Inativos' },
];

/**
 * Data sem horário ("2015-03-10") → "10/03/2015".
 * Não usa `new Date()`: ela interpretaria como meia-noite UTC e, no Brasil, mostraria o dia anterior.
 */
export function formatDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}

/** Idade completa em anos a partir de "AAAA-MM-DD" (data local de hoje). */
export function calcAge(dateOnly) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly ?? '');
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const today = new Date();
  let age = today.getFullYear() - year;
  const birthdayPassed =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!birthdayPassed) age -= 1;
  return age;
}

/** Data local de hoje em AAAA-MM-DD (para o atributo `max` de input type="date"). */
export function todayIso() {
  return new Date().toLocaleDateString('sv-SE');
}

function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

/** "52998224725" ou parcial → "529.982.247-25" (aplica conforme o usuário digita). */
export function maskCpf(value) {
  const d = onlyDigits(value).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/** "11999998888" → "(11) 99999-8888"; "1133334444" → "(11) 3333-4444". */
export function maskTelefone(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** "Administrador EscolaAvisa" -> "AE" */
export function getInitials(nome = '') {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export function getFirstName(nome = '') {
  return nome.trim().split(/\s+/)[0] ?? '';
}

export function formatDate(value, options = { dateStyle: 'long' }) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', options).format(date);
}
