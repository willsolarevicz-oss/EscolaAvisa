import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TERMOS_VERSAO } from '../src/config/termos.js';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

const app = createApp();
const tokens = {};
const ids = {};

async function login(email, senha = 'Senha@123') {
  const res = await request(app).post('/api/auth/login').send({ email, senha });
  assert.equal(res.status, 200, `login falhou para ${email}`);
  return res.body.data;
}

const api = (method, url, who = 'admin') => request(app)[method](url).set('Authorization', `Bearer ${tokens[who]}`);

async function ok(promise, status = 200) {
  const res = await promise;
  assert.equal(res.status, status, JSON.stringify(res.body));
  return res.body.data;
}

/** R: responsável de Ana (com telefone e CPF), recebeu um aviso e escreveu uma mensagem. */
before(async () => {
  await resetDatabase();
  tokens.admin = (await login('admin@escolaavis.com', 'Admin@123')).token;
  ids.admin = (await pool.query("SELECT id FROM usuarios WHERE email = 'admin@escolaavis.com'")).rows[0].id;
  ids.R = (
    await ok(
      api('post', '/api/usuarios').send({
        nome: 'Rita Responsável',
        email: 'rita@lgpd.com',
        senha: 'Senha@123',
        tipoUsuario: 'RESPONSAVEL',
        telefone: '11999998888',
        cpf: '52998224725',
      }),
      201,
    )
  ).user.id;
  ids.ANA = (await ok(api('post', '/api/alunos').send({ nome: 'Ana', dataNascimento: '2014-01-01', matricula: 'LG-1' }), 201)).aluno.id;
  await ok(api('post', `/api/alunos/${ids.ANA}/responsaveis`).send({ usuarioId: ids.R, parentesco: 'Mãe' }), 201);
  await ok(api('post', '/api/avisos').send({ titulo: 'Reunião', conteudo: 'Sexta', publico: 'TODOS' }), 201);
  tokens.R = (await login('rita@lgpd.com')).token;
  await ok(
    api('post', '/api/conversas', 'R').send({ alunoId: ids.ANA, canal: 'SECRETARIA', assunto: 'Dúvida', mensagem: 'Olá, escola!' }),
    201,
  );
  ids.P = (await createUser({ nome: 'Paulo Professor', email: 'paulo@lgpd.com', tipoUsuario: 'PROFESSOR' })).id;
});

after(async () => {
  await pool.end();
});

describe('Aceite da Política e dos Termos', () => {
  it('login e /auth/me informam a versão vigente e se já foi aceita', async () => {
    const { user } = await login('paulo@lgpd.com');
    assert.deepEqual(user.termos, { versao: TERMOS_VERSAO, aceito: false });
    tokens.P = (await login('paulo@lgpd.com')).token;
    const me = await ok(api('get', '/api/auth/me', 'P'));
    assert.deepEqual(me.user.termos, { versao: TERMOS_VERSAO, aceito: false });
  });

  it('aceitar registra versão e data; aceitar de novo mantém o primeiro registro', async () => {
    const { termos } = await ok(api('post', '/api/me/termos/aceite', 'P').send({ versao: TERMOS_VERSAO }));
    assert.equal(termos.aceito, true);
    await ok(api('post', '/api/me/termos/aceite', 'P').send({ versao: TERMOS_VERSAO }));
    const { rows } = await pool.query('SELECT versao, aceito_em, ip FROM aceites_termos WHERE usuario_id = $1', [ids.P]);
    assert.equal(rows.length, 1);
    assert.ok(rows[0].aceito_em && rows[0].ip);
    assert.equal((await ok(api('get', '/api/auth/me', 'P'))).user.termos.aceito, true);
  });

  it('versão diferente da vigente é recusada (texto mudou num lado só)', async () => {
    const res = await api('post', '/api/me/termos/aceite', 'P').send({ versao: '1999-01-01' });
    assert.equal(res.status, 409);
    assert.equal((await api('post', '/api/me/termos/aceite', 'P').send({})).status, 400);
    assert.equal((await request(app).post('/api/me/termos/aceite').send({ versao: TERMOS_VERSAO })).status, 401);
  });
});

describe('Meus dados', () => {
  it('responsável recebe a cópia dos próprios dados, sem senha', async () => {
    const res = await api('get', '/api/me/dados', 'R');
    assert.equal(res.status, 200);
    assert.equal(res.headers['cache-control'], 'no-store');
    const dados = res.body.data;
    assert.equal(dados.conta.email, 'rita@lgpd.com');
    assert.deepEqual(dados.responsavel, { telefone: '11999998888', cpf: '52998224725' });
    assert.deepEqual(dados.alunosVinculados.map((a) => [a.nome, a.parentesco]), [['Ana', 'Mãe']]);
    assert.deepEqual(dados.avisosRecebidos.map((a) => a.titulo), ['Reunião']);
    assert.deepEqual(dados.mensagensEnviadas.map((m) => [m.conversa, m.conteudo]), [['Dúvida', 'Olá, escola!']]);
    assert.ok(dados.acoesRegistradas.itens.length >= 1, 'ações do próprio usuário (ex.: login)');
    const json = JSON.stringify(dados);
    assert.ok(!json.includes('senha') && !json.includes('$2b$'), 'nunca inclui senha nem hash');
  });

  it('cada um vê só os seus: o professor não recebe dados da responsável', async () => {
    const dados = await ok(api('get', '/api/me/dados', 'P'));
    assert.equal(dados.conta.email, 'paulo@lgpd.com');
    assert.equal(dados.responsavel, null);
    assert.deepEqual(dados.alunosVinculados, []);
    assert.deepEqual(dados.mensagensEnviadas, []);
    assert.deepEqual(dados.aceitesDeTermos.map((a) => a.versao), [TERMOS_VERSAO]);
  });
});

describe('Anonimização (ADMIN)', () => {
  it('exige o usuário desativado e não vale para o próprio admin', async () => {
    assert.equal((await api('post', `/api/usuarios/${ids.R}/anonimizar`)).status, 409);
    assert.equal((await api('post', `/api/usuarios/${ids.admin}/anonimizar`)).status, 400);
    assert.equal((await api('post', `/api/usuarios/${ids.R}/anonimizar`, 'P')).status, 403);
  });

  it('apaga os dados pessoais e mantém o histórico', async () => {
    await ok(api('patch', `/api/usuarios/${ids.R}/ativo`).send({ ativo: false }));
    const { user } = await ok(api('post', `/api/usuarios/${ids.R}/anonimizar`));
    assert.equal(user.nome, 'Usuário anonimizado');
    assert.equal(user.email, `anonimizado+${ids.R}@anonimizado.invalid`);
    assert.ok(user.anonimizadoEm);
    assert.deepEqual(user.responsavel, { telefone: null, cpf: null });

    // Histórico continua apontando para o mesmo registro (aviso recebido, mensagem enviada, vínculo).
    const { rows } = await pool.query(
      `SELECT (SELECT COUNT(*)::int FROM aviso_destinatarios WHERE usuario_id = $1) AS avisos,
              (SELECT COUNT(*)::int FROM mensagens WHERE autor_id = $1) AS mensagens`,
      [ids.R],
    );
    assert.deepEqual(rows[0], { avisos: 1, mensagens: 1 });

    // Ninguém entra mais com o e-mail antigo.
    const loginAntigo = await request(app).post('/api/auth/login').send({ email: 'rita@lgpd.com', senha: 'Senha@123' });
    assert.equal(loginAntigo.status, 401);
  });

  it('anonimizado não pode ser editado, reativado nem anonimizado de novo', async () => {
    assert.equal((await api('patch', `/api/usuarios/${ids.R}/ativo`).send({ ativo: true })).status, 409);
    assert.equal((await api('patch', `/api/usuarios/${ids.R}/senha`).send({ senha: 'NovaSenha1' })).status, 409);
    assert.equal(
      (await api('put', `/api/usuarios/${ids.R}`).send({ nome: 'Rita', email: 'rita@lgpd.com' })).status,
      409,
    );
    assert.equal((await api('post', `/api/usuarios/${ids.R}/anonimizar`)).status, 409);
  });
});
