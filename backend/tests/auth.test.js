import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

const ADMIN = { email: 'admin@escolaavis.com', senha: 'Admin@123' };
const app = createApp();

function loginAs(credentials) {
  return request(app).post('/api/auth/login').send(credentials);
}

before(async () => {
  await resetDatabase();
});

after(async () => {
  await pool.end();
});

describe('GET /api/health', () => {
  it('informa que API e banco estão funcionando', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.api, 'ok');
    assert.equal(res.body.data.database, 'ok');
  });

  it('envia cabeçalhos de segurança do Helmet e não expõe o Express', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['content-security-policy']);
    assert.equal(res.headers['x-powered-by'], undefined);
  });
});

describe('POST /api/auth/login', () => {
  it('autentica o admin e retorna token + usuário sem senha', async () => {
    const res = await loginAs(ADMIN);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const { token, tokenType, expiresIn, user } = res.body.data;
    assert.equal(tokenType, 'Bearer');
    assert.ok(expiresIn > 0);
    assert.equal(user.email, ADMIN.email);
    assert.equal(user.tipoUsuario, 'ADMIN');
    assert.equal(user.nome, 'Administrador EscolaAvisa');
    assert.equal(user.senha, undefined);
    assert.equal(user.senha_hash, undefined);
    assert.ok(!JSON.stringify(res.body).includes('$2b$'), 'resposta não pode conter hash bcrypt');

    const payload = jwt.verify(token, env.jwtSecret);
    assert.equal(payload.sub, user.id);
    assert.equal(payload.tipo_usuario, 'ADMIN');
    assert.ok(payload.exp > payload.iat);
  });

  it('aceita e-mail com maiúsculas e espaços', async () => {
    const res = await loginAs({ email: '  ADMIN@EscolaAvisa.com ', senha: ADMIN.senha });
    assert.equal(res.status, 200);
  });

  it('recusa senha errada com mensagem genérica', async () => {
    const res = await loginAs({ email: ADMIN.email, senha: 'SenhaErrada@1' });
    assert.equal(res.status, 401);
    assert.deepEqual(res.body, { success: false, message: 'E-mail ou senha inválidos.' });
  });

  it('usa a mesma mensagem para e-mail inexistente', async () => {
    const res = await loginAs({ email: 'naoexiste@escolaavis.com', senha: 'qualquer' });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'E-mail ou senha inválidos.');
  });

  it('valida campos obrigatórios e formato do e-mail', async () => {
    const res = await loginAs({ email: 'invalido' });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    const fields = res.body.errors.map((e) => e.field).sort();
    assert.deepEqual(fields, ['email', 'senha']);
  });

  it('responde 400 para JSON malformado sem stack trace', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'JSON inválido no corpo da requisição.');
    assert.equal(res.body.stack, undefined);
  });

  it('bloqueia usuário inativo com senha correta (403)', async () => {
    await createUser({ email: 'inativo@escolaavis.com', senha: 'Inativo@123', ativo: false });
    const res = await loginAs({ email: 'inativo@escolaavis.com', senha: 'Inativo@123' });
    assert.equal(res.status, 403);
  });
});

describe('GET /api/auth/me', () => {
  let adminToken;

  before(async () => {
    adminToken = (await loginAs(ADMIN)).body.data.token;
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('retorna 401 com cabeçalho malformado', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Token ${adminToken}`);
    assert.equal(res.status, 401);
  });

  it('retorna 401 com token adulterado', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken.slice(0, -2)}xx`);
    assert.equal(res.status, 401);
  });

  it('retorna 401 com token assinado por outro segredo', async () => {
    const forged = jwt.sign({ tipo_usuario: 'ADMIN' }, 'outro-segredo-qualquer-com-32-caracteres!!', {
      subject: jwt.decode(adminToken).sub,
    });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    assert.equal(res.status, 401);
  });

  it('retorna 401 com token sem assinatura (alg none)', async () => {
    const unsigned = jwt.sign({ tipo_usuario: 'ADMIN', sub: jwt.decode(adminToken).sub }, null, {
      algorithm: 'none',
    });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${unsigned}`);
    assert.equal(res.status, 401);
  });

  it('retorna 401 com token expirado', async () => {
    const expired = jwt.sign(
      { tipo_usuario: 'ADMIN', exp: Math.floor(Date.now() / 1000) - 60 },
      env.jwtSecret,
      { subject: jwt.decode(adminToken).sub },
    );
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Sua sessão expirou. Faça login novamente.');
  });

  it('retorna os dados do usuário autenticado com token válido', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.email, ADMIN.email);
    assert.equal(res.body.data.user.tipoUsuario, 'ADMIN');
    assert.equal(res.body.data.user.senha_hash, undefined);
  });

  it('retorna 401 se o usuário for desativado depois do login', async () => {
    await createUser({ email: 'prof.desativado@escolaavis.com', senha: 'Prof@1234' });
    const token = (await loginAs({ email: 'prof.desativado@escolaavis.com', senha: 'Prof@1234' })).body
      .data.token;
    await pool.query("UPDATE usuarios SET ativo = FALSE WHERE email = 'prof.desativado@escolaavis.com'");

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
  });

  it('retorna 401 se o usuário do token não existir mais', async () => {
    const ghost = jwt.sign({ tipo_usuario: 'ADMIN' }, env.jwtSecret, {
      subject: '00000000-0000-4000-8000-000000000000',
    });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${ghost}`);
    assert.equal(res.status, 401);
  });
});

describe('RBAC — GET /api/admin/ping', () => {
  it('permite ADMIN', async () => {
    const token = (await loginAs(ADMIN)).body.data.token;
    const res = await request(app).get('/api/admin/ping').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.tipoUsuario, 'ADMIN');
  });

  it('nega PROFESSOR com 403', async () => {
    await createUser({ email: 'prof@escolaavis.com', senha: 'Prof@1234', tipoUsuario: 'PROFESSOR' });
    const token = (await loginAs({ email: 'prof@escolaavis.com', senha: 'Prof@1234' })).body.data.token;
    const res = await request(app).get('/api/admin/ping').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it('nega RESPONSAVEL com 403', async () => {
    await createUser({ email: 'resp@escolaavis.com', senha: 'Resp@1234', tipoUsuario: 'RESPONSAVEL' });
    const token = (await loginAs({ email: 'resp@escolaavis.com', senha: 'Resp@1234' })).body.data.token;
    const res = await request(app).get('/api/admin/ping').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 403);
  });

  it('usa o perfil do banco, não o do token (token forjado como ADMIN não passa)', async () => {
    const { rows } = await pool.query("SELECT id FROM usuarios WHERE email = 'prof@escolaavis.com'");
    const tokenComPerfilFalso = jwt.sign({ tipo_usuario: 'ADMIN' }, env.jwtSecret, {
      subject: rows[0].id,
    });
    const res = await request(app)
      .get('/api/admin/ping')
      .set('Authorization', `Bearer ${tokenComPerfilFalso}`);
    assert.equal(res.status, 403);
  });

  it('nega acesso sem token com 401', async () => {
    const res = await request(app).get('/api/admin/ping');
    assert.equal(res.status, 401);
  });
});

describe('Rotas inexistentes', () => {
  it('retornam 404 no formato padrão', async () => {
    const res = await request(app).get('/api/nao-existe');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
  });
});
