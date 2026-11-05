import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Carrega backend/.env independente da pasta de onde o processo foi iniciado.
// Variáveis já definidas no ambiente (ex.: em produção) têm prioridade.
dotenv.config({ path: path.join(backendRoot, '.env'), quiet: true });

const VALID_ENVS = ['development', 'test', 'production'];

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name} (veja backend/.env.example)`);
  }
  return value.trim();
}

function positiveInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Variável de ambiente ${name} deve ser um inteiro positivo`);
  }
  return value;
}

/**
 * Validade do JWT. Só aceita número + unidade: um número puro ("28800") seria lido
 * pelo jsonwebtoken como MILISSEGUNDOS, e um texto inválido só falharia no primeiro login.
 */
export function parseJwtExpiresIn(raw) {
  const value = raw?.trim();
  if (!value) return '8h';
  if (!/^[1-9]\d*[smhd]$/.test(value)) {
    throw new Error(
      `JWT_EXPIRES_IN inválido: "${value}". Use número + unidade (s, m, h ou d), ex.: 15m, 8h, 1d`,
    );
  }
  return value;
}

/**
 * Quantos proxies reversos ficam na frente da API (Nginx, load balancer...).
 * Sem isso, atrás de proxy todo cliente tem o IP do proxy e o rate limit do login
 * bloquearia todo mundo junto. Aceita: false (padrão), nº de proxies, ou lista de IPs/sub-redes.
 */
export function parseTrustProxy(raw) {
  const value = raw?.trim();
  if (!value || value === 'false' || value === '0') return false;
  if (/^\d+$/.test(value)) return Number(value);
  if (value === 'true') {
    // "true" confia em qualquer X-Forwarded-For: o cliente poderia forjar o IP e burlar o rate limit.
    throw new Error('TRUST_PROXY=true é inseguro. Informe o número de proxies (ex.: 1) ou os IPs deles.');
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';
if (!VALID_ENVS.includes(nodeEnv)) {
  throw new Error(`NODE_ENV inválido: ${nodeEnv}. Use: ${VALID_ENVS.join(', ')}`);
}

// Os testes nunca usam o banco principal, para não apagar dados de desenvolvimento.
const databaseUrl = nodeEnv === 'test' ? required('TEST_DATABASE_URL') : required('DATABASE_URL');

const jwtSecret = required('JWT_SECRET');
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres');
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: positiveInt('PORT', 3333),
  databaseUrl,
  jwtSecret,
  jwtExpiresIn: parseJwtExpiresIn(process.env.JWT_EXPIRES_IN),
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  authRateLimitMax: positiveInt('AUTH_RATE_LIMIT_MAX', 10),
  authRateLimitWindowMinutes: positiveInt('AUTH_RATE_LIMIT_WINDOW_MINUTES', 15),
  // Feriados nacionais (sem chave de API). Configurável para apontar para um espelho ou desligar nos testes.
  brasilApiUrl: (process.env.BRASILAPI_URL || 'https://brasilapi.com.br/api').trim().replace(/\/+$/, ''),
  brasilApiTimeoutMs: positiveInt('BRASILAPI_TIMEOUT_MS', 3000),
  backendRoot,
});
