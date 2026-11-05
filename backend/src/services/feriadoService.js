import { env } from '../config/env.js';

/**
 * Feriados nacionais via BrasilAPI (GET /feriados/v1/{ano}).
 *
 * Integração externa = pode falhar. Regras:
 * - quem chama é o backend (o navegador nunca fala com a BrasilAPI);
 * - timeout curto: API lenta não pode travar o calendário;
 * - cache em memória por ano (feriado nacional praticamente não muda);
 * - falha NUNCA quebra o calendário: devolve `null` e quem chama mostra "indisponível".
 */

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
// Depois de uma falha, espera um pouco antes de tentar de novo (não martela a API a cada clique).
const FAILURE_TTL_MS = 60 * 1000;

const cache = new Map(); // ano -> { feriados: [...] | null, expiresAt }
const inFlight = new Map(); // ano -> Promise (várias requisições simultâneas fazem 1 chamada só)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Valida o formato da resposta: não confiamos cegamente em dado externo. */
function parseFeriados(body, ano) {
  if (!Array.isArray(body)) throw new Error('resposta não é uma lista');
  return body
    .filter(
      (item) =>
        item &&
        typeof item.date === 'string' &&
        DATE_RE.test(item.date) &&
        item.date.startsWith(`${ano}-`) &&
        typeof item.name === 'string' &&
        item.name.trim() !== '',
    )
    .map((item) => ({ data: item.date, nome: item.name.trim().slice(0, 150) }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

async function fetchFeriados(ano) {
  const url = `${env.brasilApiUrl}/feriados/v1/${ano}`;
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(env.brasilApiTimeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return parseFeriados(await response.json(), ano);
  } catch (error) {
    // Não é erro da nossa API: registra e segue sem feriados.
    if (!env.isTest) console.warn(`[brasilapi] feriados de ${ano} indisponíveis: ${error.message}`);
    return null;
  }
}

/**
 * Feriados nacionais do ano: `[{ data: 'AAAA-MM-DD', nome }]`, ou `null` se a BrasilAPI
 * estiver indisponível.
 */
export async function getFeriadosDoAno(ano) {
  const cached = cache.get(ano);
  if (cached && cached.expiresAt > Date.now()) return cached.feriados;

  if (!inFlight.has(ano)) {
    const promise = fetchFeriados(ano)
      .then((feriados) => {
        cache.set(ano, { feriados, expiresAt: Date.now() + (feriados ? CACHE_TTL_MS : FAILURE_TTL_MS) });
        return feriados;
      })
      .finally(() => inFlight.delete(ano));
    inFlight.set(ano, promise);
  }
  return inFlight.get(ano);
}

/** Só para testes: começa sem nada em cache. */
export function clearFeriadosCache() {
  cache.clear();
  inFlight.clear();
}
