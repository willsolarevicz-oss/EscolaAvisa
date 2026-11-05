const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Evita mandar ao PostgreSQL um id malformado (que geraria erro 22P02 em vez de 404). */
export function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}
