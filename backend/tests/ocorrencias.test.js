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

const hoje = () => new Date().toLocaleDateString('sv-SE');

/**
 * Cenário: turma T (prof P leciona; prof Q não) com aluno A1 (R1 autorizado, R2 NÃO autorizado).
 * Aluno A2 sem turma e sem responsável. Aluno A3 inativo.
 */
before(async () => {
  await resetDatabase();
  tokens.admin = await tokenFor('admin@escolaavis.com', 'Admin@123');

  for (const [key, tipoUsuario] of [['P', 'PROFESSOR'], ['Q', 'PROFESSOR'], ['R1', 'RESPONSAVEL'], ['R2', 'RESPONSAVEL']]) {
    ids[key] = (await createUser({ nome: `Usuário ${key}`, email: `${key.toLowerCase()}@oc.com`, tipoUsuario })).id;
  }

  const disciplina = (await ok(api('post', '/api/disciplinas').send({ nome: 'Ciências' }))).disciplina;
  ids.T = (await ok(api('post', '/api/turmas').send({ nome: 'Turma T', anoLetivo: 2026, turno: 'MATUTINO' }))).turma.id;
  for (const [key, nome, matricula] of [['A1', 'Ana Ocorrência', 'OC-1'], ['A2', 'Bruno Ocorrência', 'OC-2'], ['A3', 'Caio Inativo', 'OC-3']]) {
    ids[key] = (await ok(api('post', '/api/alunos').send({ nome, dataNascimento: '2014-05-05', matricula }))).aluno.id;
  }
  await ok(api('patch', `/api/alunos/${ids.A3}/ativo`).send({ ativo: false }), 200);
  await ok(api('post', `/api/turmas/${ids.T}/alunos`).send({ alunoId: ids.A1 }));
  await ok(api('post', `/api/turmas/${ids.T}/professores`).send({ professorId: ids.P, disciplinaId: disciplina.id }));
  await ok(api('post', `/api/alunos/${ids.A1}/responsaveis`).send({ usuarioId: ids.R1, parentesco: 'Mãe' }));
  await ok(api('post', `/api/alunos/${ids.A1}/responsaveis`).send({ usuarioId: ids.R2, parentesco: 'Pai', autorizadoReceberComunicacoes: false }));

  for (const key of ['P', 'Q', 'R1', 'R2']) tokens[key] = await tokenFor(`${key.toLowerCase()}@oc.com`);
});

after(async () => {
  await pool.end();
});

const nova = (overrides) => ({ tipo: 'ATRASO', descricao: 'Chegou 20 minutos atrasado.', dataOcorrencia: hoje(), ...overrides });

describe('Registro de ocorrências', () => {
  it('professor registra para aluno de sua turma; só responsáveis autorizados devem dar ciência', async () => {
    const res = await api('post', '/api/ocorrencias', 'P').send(nova({ alunoId: ids.A1 }));
    assert.equal(res.status, 201);
    assert.equal(res.body.message, 'Ocorrência registrada. 1 responsável deve dar ciência.');
    const { ocorrencia } = res.body.data;
    ids.ocP = ocorrencia.id;
    assert.equal(ocorrencia.aluno.nome, 'Ana Ocorrência');
    assert.equal(ocorrencia.autor.nome, 'Usuário P');
    assert.equal(ocorrencia.totalResponsaveis, 1);
    assert.equal(ocorrencia.dataOcorrencia, hoje());
  });

  it('admin registra mesmo para aluno sem responsável (registro escolar)', async () => {
    const res = await api('post', '/api/ocorrencias').send(nova({ alunoId: ids.A2, tipo: 'ELOGIO', descricao: 'Ajudou os colegas.' }));
    assert.equal(res.status, 201);
    ids.ocAdmin = res.body.data.ocorrencia.id;
    assert.equal(res.body.data.ocorrencia.totalResponsaveis, 0);
    assert.match(res.body.message, /não tem responsável autorizado/);
  });

  it('professor não registra para aluno fora das suas turmas (403)', async () => {
    assert.equal((await api('post', '/api/ocorrencias', 'Q').send(nova({ alunoId: ids.A1 }))).status, 403);
    assert.equal((await api('post', '/api/ocorrencias', 'P').send(nova({ alunoId: ids.A2 }))).status, 403);
  });

  it('valida data, tipo e aluno', async () => {
    const amanha = new Date(Date.now() + 2 * 86_400_000).toLocaleDateString('sv-SE');
    const casos = [
      [nova({ alunoId: ids.A1, dataOcorrencia: amanha }), 'dataOcorrencia'],
      [nova({ alunoId: ids.A1, tipo: 'BRIGA' }), 'tipo'],
      [nova({ alunoId: ids.A1, descricao: '   ' }), 'descricao'],
      [nova({ alunoId: ids.A3 }), 'alunoId'], // inativo
      [nova({ alunoId: '00000000-0000-4000-8000-000000000000' }), 'alunoId'],
    ];
    for (const [body, field] of casos) {
      const res = await api('post', '/api/ocorrencias').send(body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assert.equal(res.body.errors[0].field, field);
    }
  });

  it('responsável não acessa a gestão (403)', async () => {
    assert.equal((await api('get', '/api/ocorrencias', 'R1')).status, 403);
    assert.equal((await api('post', '/api/ocorrencias', 'R1').send(nova({ alunoId: ids.A1 }))).status, 403);
  });
});

describe('Ciência do responsável', () => {
  it('cada responsável vê só as ocorrências que lhe cabem', async () => {
    const r1 = await api('get', '/api/me/ocorrencias', 'R1');
    assert.deepEqual(r1.body.data.items.map((o) => [o.alunoNome, o.ciente]), [['Ana Ocorrência', false]]);
    const r2 = await api('get', '/api/me/ocorrencias', 'R2'); // não autorizado
    assert.equal(r2.body.data.pagination.total, 0);
    assert.equal((await api('get', `/api/me/ocorrencias/${ids.ocAdmin}`, 'R1')).status, 404);
  });

  it('"estou ciente" é idempotente e aparece no relatório', async () => {
    const primeira = await ok(api('post', `/api/me/ocorrencias/${ids.ocP}/ciencia`, 'R1'), 200);
    const segunda = await ok(api('post', `/api/me/ocorrencias/${ids.ocP}/ciencia`, 'R1'), 200);
    assert.equal(segunda.cienteEm, primeira.cienteEm);

    const pendentes = await api('get', '/api/me/ocorrencias?pendentes=true', 'R1');
    assert.equal(pendentes.body.data.pagination.total, 0);

    const detalhe = (await api('get', `/api/ocorrencias/${ids.ocP}`)).body.data.ocorrencia;
    assert.equal(detalhe.totalCientes, 1);
    assert.deepEqual(detalhe.ciencias.map((c) => [c.usuario.nome, c.ciente]), [['Usuário R1', true]]);
  });
});

describe('Gestão pelo professor, filtros e arquivamento', () => {
  it('professor vê só as próprias ocorrências', async () => {
    const lista = await api('get', '/api/ocorrencias', 'P');
    assert.deepEqual(lista.body.data.items.map((o) => o.id), [ids.ocP]);
    assert.equal((await api('get', `/api/ocorrencias/${ids.ocAdmin}`, 'P')).status, 404);
  });

  it('admin filtra por aluno e por tipo', async () => {
    const porAluno = await api('get', `/api/ocorrencias?alunoId=${ids.A2}`);
    assert.deepEqual(porAluno.body.data.items.map((o) => o.tipo), ['ELOGIO']);
    const porTipo = await api('get', '/api/ocorrencias?tipo=ATRASO');
    assert.deepEqual(porTipo.body.data.items.map((o) => o.aluno.nome), ['Ana Ocorrência']);
    const busca = await api('get', '/api/ocorrencias?busca=bruno');
    assert.equal(busca.body.data.pagination.total, 1);
  });

  it('arquivada some para o responsável', async () => {
    await ok(api('patch', `/api/ocorrencias/${ids.ocP}/ativo`, 'P').send({ ativo: false }), 200);
    assert.equal((await api('get', '/api/me/ocorrencias', 'R1')).body.data.pagination.total, 0);
    assert.equal((await api('get', `/api/me/ocorrencias/${ids.ocP}`, 'R1')).status, 404);
  });

  it('/api/me/alunos lista só alunos ativos das turmas do professor', async () => {
    const todos = await api('get', '/api/me/alunos', 'P');
    assert.deepEqual(todos.body.data.alunos.map((a) => a.nome), ['Ana Ocorrência']);
    const busca = await api('get', '/api/me/alunos?busca=oc-1', 'P');
    assert.equal(busca.body.data.alunos.length, 1);
    assert.equal((await api('get', '/api/me/alunos', 'Q')).body.data.alunos.length, 0);
    assert.equal((await api('get', '/api/me/alunos', 'R1')).status, 403);
  });
});
