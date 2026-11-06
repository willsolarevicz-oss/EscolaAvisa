import assert from 'node:assert/strict';
import { setTimeout as esperar } from 'node:timers/promises';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { normalizarRota } from '../src/middlewares/auditoria.js';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

const app = createApp();
const tokens = {};
const ids = {};

async function tokenFor(email, senha = 'Senha@123') {
  const res = await request(app).post('/api/auth/login').send({ email, senha });
  assert.equal(res.status, 200, `login falhou para ${email}`);
  return res.body.data.token;
}

const api = (method, url, who = 'admin') => request(app)[method](url).set('Authorization', `Bearer ${tokens[who]}`);

/** O registro é gravado DEPOIS da resposta: espera ele aparecer (até ~2 s). */
async function registrosOnde(condicao, params) {
  for (let i = 0; i < 40; i += 1) {
    const { rows } = await pool.query(`SELECT * FROM auditoria WHERE ${condicao} ORDER BY criado_em`, params);
    if (rows.length > 0) return rows;
    await esperar(50);
  }
  return [];
}

before(async () => {
  await resetDatabase();
  tokens.admin = await tokenFor('admin@escolaavis.com', 'Admin@123');
  ids.admin = (await pool.query("SELECT id FROM usuarios WHERE email = 'admin@escolaavis.com'")).rows[0].id;
  await createUser({ nome: 'Professora', email: 'p@aud.com', tipoUsuario: 'PROFESSOR' });
  tokens.P = await tokenFor('p@aud.com');
});

after(async () => {
  await pool.end();
});

describe('Registro de auditoria', () => {
  it('normaliza a rota e separa o id do recurso', () => {
    assert.deepEqual(normalizarRota('/api/usuarios/3f2c9a1e-1b2c-4d3e-8f90-123456789abc/ativo?x=1'), {
      rota: '/api/usuarios/:id/ativo',
      recursoId: '3f2c9a1e-1b2c-4d3e-8f90-123456789abc',
    });
    assert.deepEqual(normalizarRota('/api/auth/login'), { rota: '/api/auth/login', recursoId: null });
  });

  it('registra quem criou o usuário, sem guardar a senha', async () => {
    const res = await api('post', '/api/usuarios').send({
      nome: 'Novo Usuário',
      email: 'novo@aud.com',
      senha: 'SenhaSecreta1',
      tipoUsuario: 'PROFESSOR',
    });
    assert.equal(res.status, 201);
    const [registro] = await registrosOnde("rota = '/api/usuarios' AND metodo = 'POST'");
    assert.equal(registro.usuario_id, ids.admin);
    assert.equal(registro.status, 201);
    assert.ok(registro.ip);
    assert.ok(!JSON.stringify(registro).includes('SenhaSecreta1'), 'a senha não pode ir para a auditoria');
  });

  it('registra login com sucesso (com o usuário) e com falha (sem usuário)', async () => {
    await request(app).post('/api/auth/login').send({ email: 'p@aud.com', senha: 'errada' });
    const falhas = await registrosOnde("rota = '/api/auth/login' AND status = 401");
    assert.equal(falhas[0].usuario_id, null);
    const sucessos = await registrosOnde("rota = '/api/auth/login' AND status = 200 AND usuario_id IS NOT NULL");
    assert.ok(sucessos.length >= 2, 'os logins do before() foram registrados com o usuário');
  });

  it('leituras (GET) não são registradas', async () => {
    const antes = (await pool.query("SELECT COUNT(*)::int AS n FROM auditoria WHERE rota = '/api/usuarios'")).rows[0].n;
    await api('get', '/api/usuarios');
    await esperar(200);
    const depois = (await pool.query("SELECT COUNT(*)::int AS n FROM auditoria WHERE rota = '/api/usuarios'")).rows[0].n;
    assert.equal(depois, antes);
  });

  it('tentativa sem permissão também fica registrada', async () => {
    await api('post', '/api/usuarios', 'P').send({ nome: 'X', email: 'x@aud.com', senha: 'Senha@123', tipoUsuario: 'ADMIN' });
    const negadas = await registrosOnde("rota = '/api/usuarios' AND status = 403");
    assert.equal(negadas.length, 1);
  });
});

describe('Consulta da auditoria', () => {
  it('admin vê a trilha, mais recente primeiro, com filtros de falha e de quem fez', async () => {
    const { items } = (await api('get', '/api/auditoria')).body.data;
    assert.ok(items.length >= 4);
    assert.ok(items[0].criadoEm >= items.at(-1).criadoEm);

    const falhas = (await api('get', '/api/auditoria?falhas=true')).body.data.items;
    assert.ok(falhas.length >= 2 && falhas.every((r) => r.status >= 400));

    const doAdmin = (await api('get', '/api/auditoria?busca=administrador')).body.data.items;
    assert.ok(doAdmin.length >= 1 && doAdmin.every((r) => r.usuario?.email === 'admin@escolaavis.com'));
  });

  it('só a administração consulta', async () => {
    assert.equal((await api('get', '/api/auditoria', 'P')).status, 403);
    assert.equal((await request(app).get('/api/auditoria')).status, 401);
  });
});
