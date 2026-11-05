import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

const app = createApp();
let adminToken;

async function tokenFor(credentials) {
  const res = await request(app).post('/api/auth/login').send(credentials);
  assert.equal(res.status, 200);
  return res.body.data.token;
}

function api(method, url, token = adminToken) {
  return request(app)[method](url).set('Authorization', `Bearer ${token}`);
}

before(async () => {
  await resetDatabase();
  adminToken = await tokenFor({ email: 'admin@escolaavis.com', senha: 'Admin@123' });
});

after(async () => {
  await pool.end();
});

describe('/api/disciplinas', () => {
  it('é exclusivo de ADMIN', async () => {
    assert.equal((await request(app).get('/api/disciplinas')).status, 401);
    await createUser({ email: 'prof.disc@escolaavis.com', senha: 'Prof@1234', tipoUsuario: 'PROFESSOR' });
    const profToken = await tokenFor({ email: 'prof.disc@escolaavis.com', senha: 'Prof@1234' });
    assert.equal((await api('get', '/api/disciplinas', profToken)).status, 403);
  });

  it('cadastra (201) e recusa nome repetido sem diferenciar maiúsculas (409)', async () => {
    const res = await api('post', '/api/disciplinas').send({ nome: '  Matemática ', descricao: '  ' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.disciplina.nome, 'Matemática');
    assert.equal(res.body.data.disciplina.descricao, null);

    const dup = await api('post', '/api/disciplinas').send({ nome: 'MATEMÁTICA' });
    assert.equal(dup.status, 409);
    assert.deepEqual(dup.body.errors[0], { field: 'nome', message: 'Já existe uma disciplina com este nome.' });
  });

  it('valida o nome', async () => {
    const res = await api('post', '/api/disciplinas').send({ nome: 'M' });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].field, 'nome');
  });

  it('lista com busca, filtro de situação e ordem alfabética', async () => {
    await api('post', '/api/disciplinas').send({ nome: 'Português' });
    const historia = await api('post', '/api/disciplinas').send({ nome: 'História', descricao: 'Brasil e geral' });
    await api('patch', `/api/disciplinas/${historia.body.data.disciplina.id}/ativo`).send({ ativo: false });

    const todas = await api('get', '/api/disciplinas');
    assert.deepEqual(todas.body.data.items.map((d) => d.nome), ['História', 'Matemática', 'Português']);

    const ativas = await api('get', '/api/disciplinas?ativo=true');
    assert.deepEqual(ativas.body.data.items.map((d) => d.nome), ['Matemática', 'Português']);

    const busca = await api('get', '/api/disciplinas?busca=port');
    assert.deepEqual(busca.body.data.items.map((d) => d.nome), ['Português']);
  });

  it('edita, detalha e responde 404 para id inválido', async () => {
    const criada = await api('post', '/api/disciplinas').send({ nome: 'Ciências' });
    const id = criada.body.data.disciplina.id;

    const editar = await api('put', `/api/disciplinas/${id}`).send({ nome: 'Ciências Naturais', descricao: 'Física, química e biologia' });
    assert.equal(editar.status, 200);
    assert.equal(editar.body.data.disciplina.descricao, 'Física, química e biologia');

    const detalhe = await api('get', `/api/disciplinas/${id}`);
    assert.equal(detalhe.body.data.disciplina.nome, 'Ciências Naturais');

    assert.equal((await api('get', '/api/disciplinas/xyz')).status, 404);
  });
});
