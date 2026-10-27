/**
 * Lê o payload do JWT SEM validar a assinatura (quem valida é o backend).
 * Serve só para saber quando o token expira e encerrar a sessão no horário certo.
 */
export function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/** Milissegundos até o token expirar (negativo se já expirou; null se não der para saber). */
export function getTokenRemainingMs(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000 - Date.now();
}
