import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

const app = createApp();
const SENHA = 'Senha@123';
const tokens = {};
const ids = {};

async function tokenFor(email, senha = SENHA) {
  const res = await request(app).post('/api/auth/login').send({ email, senha });
  assert.equal(res.status, 200, `login falhou para ${email}`);
  return res.body.data.token;
}

function api(method, url, who = 'admin') {
  return request(app)[method](url).set('Authorization', `Bearer ${tokens[who]}`);
}

async function ok(promise, status = 201) {
  const res = await promise;
  assert.equal(res.status, status, JSON.stringify(res.body));
  return res.body.data;
}

/**
 * Conceição: mãe (principal, autorizada) de Ana; avó NÃO autorizada de Bia.
 * Joaquim: responsável sem nenhum aluno. Inativo: responsável desativado, autorizado de Caio.
 * Pendências esperadas: Bia (só vínculo não autorizado), Caio (responsável inativo), Davi (sem vínculo).
 */
before(async () => {
  await resetDatabase();
  tokens.admin = await tokenFor('admin@escolaavis.com', 'Admin@123');
  const novoUsuario = async (nome, email) => (await createUser({ nome, email, tipoUsuario: 'RESPONSAVEL' })).id;
  ids.CONCEICAO = await novoUsuario('Conceição Souza', 'conceicao@resp.com');
  ids.JOAQUIM = await novoUsuario('Joaquim Lima', 'joaquim@resp.com');
  ids.INATIVO = await novoUsuario('Irene Inativa', 'irene@resp.com');
  ids.P = (await createUser({ nome: 'Professora', email: 'p@resp.com', tipoUsuario: 'PROFESSOR' })).id;

  for (const [key, nome, matricula] of [['ANA', 'Ana', 'RS-1'], ['BIA', 'Bia', 'RS-2'], ['CAIO', 'Caio', 'RS-3'], ['DAVI', 'Davi', 'RS-4']]) {
    ids[key] = (await ok(api('post', '/api/alunos').send({ nome, dataNascimento: '2013-02-02', matricula }))).aluno.id;
  }
  const vincular = (aluno, usuarioId, extra) => ok(api('post', `/api/alunos/${ids[aluno]}/responsaveis`).send({ usuarioId, ...extra }));
  await vincular('ANA', ids.CONCEICAO, { parentesco: 'Mãe', responsavelPrincipal: true });
  await vincular('BIA', ids.CONCEICAO, { parentesco: 'Avó', autorizadoReceberComunicacoes: false });
  await vincular('CAIO', ids.INATIVO, { parentesco: 'Tia' });
  // Só dá para vincular responsável ativo; ele é desativado depois (caso real).
  await ok(api('patch', `/api/usuarios/${ids.INATIVO}/ativo`).send({ ativo: false }), 200);

  tokens.P = await tokenFor('p@resp.com');
  tokens.R = await tokenFor('conceicao@resp.com');
});

after(async () => {
  await pool.end();
});

describe('Listagem de responsáveis', () => {
  it('lista os responsáveis com seus alunos, em ordem de nome', async () => {
    const { items, pagination } = await ok(api('get', '/api/responsaveis'), 200);
    assert.equal(pagination.total, 3);
    assert.deepEqual(items.map((r) => r.usuario.nome), ['Conceição Souza', 'Irene Inativa', 'Joaquim Lima']);
    const conceicao = items[0];
    assert.deepEqual(
      conceicao.alunos.map((a) => [a.nome, a.parentesco, a.principal, a.autorizado]),
      [['Ana', 'Mãe', true, true], ['Bia', 'Avó', false, false]],
    );
    assert.deepEqual(items[2].alunos, [], 'responsável sem registro em `responsaveis` ainda aparece');
  });

  it('busca sem acento, filtro de situação e "sem aluno"', async () => {
    const nomes = async (query) => (await ok(api('get', `/api/responsaveis${query}`), 200)).items.map((r) => r.usuario.nome);
    assert.deepEqual(await nomes('?busca=conceicao'), ['Conceição Souza']);
    assert.deepEqual(await nomes('?ativo=false'), ['Irene Inativa']);
    assert.deepEqual(await nomes('?semAluno=true'), ['Joaquim Lima']);
    assert.equal((await api('get', '/api/responsaveis?semAluno=talvez')).status, 400);
  });

  it('só a administração acessa', async () => {
    assert.equal((await api('get', '/api/responsaveis', 'P')).status, 403);
    assert.equal((await api('get', '/api/responsaveis/pendencias', 'R')).status, 403);
    assert.equal((await request(app).get('/api/responsaveis')).status, 401);
  });
});

describe('Alunos sem responsável autorizado', () => {
  it('lista alunos ativos cuja família não recebe comunicações', async () => {
    const { total, alunos } = await ok(api('get', '/api/responsaveis/pendencias'), 200);
    assert.equal(total, 3);
    assert.deepEqual(
      alunos.map((a) => [a.nome, a.totalVinculos]),
      [['Bia', 1], ['Caio', 1], ['Davi', 0]],
    );
  });

  it('autorizar o vínculo tira o aluno da lista; aluno desativado não conta', async () => {
    const vinculo = (await ok(api('get', `/api/alunos/${ids.BIA}/responsaveis`), 200)).responsaveis[0];
    await ok(
      api('put', `/api/alunos/${ids.BIA}/responsaveis/${vinculo.id}`).send({
        parentesco: 'Avó',
        responsavelPrincipal: false,
        autorizadoReceberComunicacoes: true,
      }),
      200,
    );
    await ok(api('patch', `/api/alunos/${ids.DAVI}/ativo`).send({ ativo: false }), 200);
    const { total, alunos } = await ok(api('get', '/api/responsaveis/pendencias'), 200);
    assert.equal(total, 1);
    assert.deepEqual(alunos.map((a) => a.nome), ['Caio']);
  });
});
