const ROLE_LABELS = {
  ADMIN: 'Administrador',
  PROFESSOR: 'Professor',
  RESPONSAVEL: 'Responsável',
};

export function roleLabel(tipoUsuario) {
  return ROLE_LABELS[tipoUsuario] ?? tipoUsuario;
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
