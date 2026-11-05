/** % e _ são curingas do LIKE: escapamos para a busca do usuário ser literal (ex.: "joao_silva"). */
export function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

/** Padrão de busca "contém" para ILIKE, já escapado. */
export function containsPattern(value) {
  return `%${escapeLike(value)}%`;
}

/**
 * Condição de busca "contém", sem diferenciar maiúsculas NEM acentos ("joao" acha "João"),
 * em uma ou mais colunas. Use com `containsPattern(termo)` no parâmetro.
 * `colunas` são nomes FIXOS escritos no código (nunca vindos do usuário); `placeholder` é o "$n".
 */
export function buscaSemAcento(colunas, placeholder) {
  const condicoes = colunas.map((coluna) => `unaccent(${coluna}) ILIKE unaccent(${placeholder})`);
  return condicoes.length > 1 ? `(${condicoes.join(' OR ')})` : condicoes[0];
}
