import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from './helpers/testDb.js';

describe('frontend entregue pela API (FRONTEND_DIST_DIR)', () => {
  let pasta;
  let app;

  before(async () => {
    pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'escolaavis-dist-'));
    await fs.mkdir(path.join(pasta, 'assets'));
    await fs.writeFile(path.join(pasta, 'index.html'), '<!doctype html><title>EscolaAvis</title>');
    await fs.writeFile(path.join(pasta, 'assets', 'app.js'), 'console.log(1)');
    app = createApp({ frontendDistDir: pasta });
  });
  after(async () => {
    await fs.rm(pasta, { recursive: true, force: true });
    await pool.end();
  });

  it('entrega os arquivos do build', async () => {
    const res = await request(app).get('/assets/app.js');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /javascript/);
  });

  it('rotas do React (ex.: /alunos) recebem o index.html', async () => {
    for (const rota of ['/', '/alunos', '/avisos/123']) {
      const res = await request(app).get(rota);
      assert.equal(res.status, 200, rota);
      assert.match(res.text, /<title>EscolaAvis<\/title>/, rota);
    }
  });

  it('a API continua respondendo JSON, inclusive o 404', async () => {
    const res = await request(app).get('/api/rota-que-nao-existe');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });

  it('sem a pasta configurada, fora da /api é 404 (só API, como antes)', async () => {
    const res = await request(createApp({ frontendDistDir: '' })).get('/alunos');
    assert.equal(res.status, 404);
  });
});
