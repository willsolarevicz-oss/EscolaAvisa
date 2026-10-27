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
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || '8h',
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  authRateLimitMax: positiveInt('AUTH_RATE_LIMIT_MAX', 10),
  authRateLimitWindowMinutes: positiveInt('AUTH_RATE_LIMIT_WINDOW_MINUTES', 15),
  backendRoot,
});
