/** % e _ são curingas do LIKE: escapamos para a busca do usuário ser literal (ex.: "joao_silva"). */
export function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

/** Padrão de busca "contém" para ILIKE, já escapado. */
export function containsPattern(value) {
  return `%${escapeLike(value)}%`;
}
