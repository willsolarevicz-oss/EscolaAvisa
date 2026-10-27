import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
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
});
