/** Converte a lista `errors` do backend ({ field, message }) em { campo: mensagem } para os formulários. */
export function toFieldErrors(error) {
  const list = error?.response?.data?.errors;
  if (!Array.isArray(list)) return {};
  return Object.fromEntries(list.filter((e) => e.field).map((e) => [e.field, e.message]));
}
