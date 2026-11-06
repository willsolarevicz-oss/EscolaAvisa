import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { createApiRateLimiter } from '../src/middlewares/rateLimiters.js';
import { pool, resetDatabase } from './helpers/testDb.js';

// Arquivo separado: cada arquivo de teste roda em um processo próprio,
// então o contador do rate limit começa zerado aqui.
const app = createApp();

before(async () => {
  await resetDatabase();
});

after(async () => {
  await pool.end();
});

describe('Rate limit do login', () => {
  it('login correto não consome tentativas', async () => {
    for (let i = 0; i < env.authRateLimitMax + 2; i += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@escolaavis.com', senha: 'Admin@123' });
      assert.equal(res.status, 200);
    }
  });

  it(`bloqueia com 429 após ${env.authRateLimitMax} tentativas falhas`, async () => {
    const wrong = { email: 'admin@escolaavis.com', senha: 'errada' };
    for (let i = 0; i < env.authRateLimitMax; i += 1) {
      const res = await request(app).post('/api/auth/login').send(wrong);
      assert.equal(res.status, 401);
    }

    const blocked = await request(app).post('/api/auth/login').send(wrong);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.success, false);
    assert.ok(blocked.headers['ratelimit-policy'] || blocked.headers.ratelimit);

    // Outras rotas não são afetadas pelo limite do login.
    const health = await request(app).get('/api/health');
    assert.equal(health.status, 200);
  });

  it('sem TRUST_PROXY, X-Forwarded-For forjado não escapa do bloqueio', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.10')
      .send({ email: 'admin@escolaavis.com', senha: 'errada' });
    assert.equal(res.status, 429);
  });

  it('com TRUST_PROXY, cada cliente real atrás do proxy tem seu próprio limite', async () => {
    const behindProxy = createApp();
    behindProxy.set('trust proxy', 1);

    // O IP local já está bloqueado, mas um cliente diferente (vindo pelo proxy) não deve estar.
    const res = await request(behindProxy)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '203.0.113.20')
      .send({ email: 'admin@escolaavis.com', senha: 'errada' });
    assert.equal(res.status, 401);
  });
});

describe('Rate limit geral da API', () => {
  it('está ligado no app (cabeçalhos de limite em qualquer rota da /api)', async () => {
    const res = await request(app).get('/api/health');
    assert.ok(res.headers.ratelimit || res.headers['ratelimit-policy'], JSON.stringify(res.headers));
  });

  it('bloqueia com 429 ao passar do limite e responde no formato da API', async () => {
    // App mínimo com um limitador pequeno (o do app usa API_RATE_LIMIT_MAX, alto nos testes).
    const pequeno = express();
    pequeno.use(createApiRateLimiter({ limit: 3, windowMs: 60_000 }));
    pequeno.get('/x', (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 3; i += 1) assert.equal((await request(pequeno).get('/x')).status, 200);
    const bloqueado = await request(pequeno).get('/x');
    assert.equal(bloqueado.status, 429);
    assert.equal(bloqueado.body.success, false);
    assert.match(bloqueado.body.message, /Muitas requisições/);
  });
});
