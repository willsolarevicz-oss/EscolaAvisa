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

/** "Administrador EscolaAvis" -> "AE" */
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
