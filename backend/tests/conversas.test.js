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

const naoLidas = async (who, conversaId) =>
  (await ok(api('get', '/api/conversas', who), 200)).items.find((c) => c.id === conversaId)?.naoLidas;

/**
 * Cenário: turma T (P leciona) com A1; A2 sem turma.
 * R1 responsável autorizado de A1 e A2; R2 NÃO autorizado de A1.
 * Q é professor de outra turma (não atende A1). ADMIN2 é um segundo admin.
 */
before(async () => {
  await resetDatabase();
  tokens.admin = await tokenFor('admin@escolaavis.com', 'Admin@123');

  const pessoas = [['P', 'PROFESSOR'], ['Q', 'PROFESSOR'], ['R1', 'RESPONSAVEL'], ['R2', 'RESPONSAVEL'], ['ADMIN2', 'ADMIN']];
  for (const [key, tipoUsuario] of pessoas) {
    ids[key] = (await createUser({ nome: `Usuário ${key}`, email: `${key.toLowerCase()}@msg.com`, tipoUsuario })).id;
  }
  const disc = (await ok(api('post', '/api/disciplinas').send({ nome: 'Matemática' }))).disciplina.id;
  ids.T = (await ok(api('post', '/api/turmas').send({ nome: 'Turma T', anoLetivo: 2026, turno: 'MATUTINO' }))).turma.id;
  ids.T2 = (await ok(api('post', '/api/turmas').send({ nome: 'Turma T2', anoLetivo: 2026, turno: 'NOTURNO' }))).turma.id;
  for (const [key, matricula] of [['A1', 'MS-1'], ['A2', 'MS-2']]) {
    ids[key] = (await ok(api('post', '/api/alunos').send({ nome: `Aluno ${key}`, dataNascimento: '2013-02-02', matricula }))).aluno.id;
  }
  await ok(api('post', `/api/turmas/${ids.T}/alunos`).send({ alunoId: ids.A1 }));
  await ok(api('post', `/api/turmas/${ids.T}/professores`).send({ professorId: ids.P, disciplinaId: disc }));
  await ok(api('post', `/api/turmas/${ids.T2}/professores`).send({ professorId: ids.Q, disciplinaId: disc }));
  await ok(api('post', `/api/alunos/${ids.A1}/responsaveis`).send({ usuarioId: ids.R1, parentesco: 'Mãe' }));
  await ok(api('post', `/api/alunos/${ids.A2}/responsaveis`).send({ usuarioId: ids.R1, parentesco: 'Mãe' }));
  await ok(
    api('post', `/api/alunos/${ids.A1}/responsaveis`).send({ usuarioId: ids.R2, parentesco: 'Pai', autorizadoReceberComunicacoes: false }),
  );

  for (const key of ['P', 'Q', 'R1', 'R2', 'ADMIN2']) tokens[key] = await tokenFor(`${key.toLowerCase()}@msg.com`);
});

after(async () => {
  await pool.end();
});

describe('Contatos para nova conversa', () => {
  it('responsável vê seus alunos autorizados e os professores de cada um', async () => {
    const { alunos } = await ok(api('get', '/api/conversas/contatos', 'R1'), 200);
    assert.deepEqual(
      alunos.map((a) => [a.nome, a.professores.map((p) => p.nome)]),
      [['Aluno A1', ['Usuário P']], ['Aluno A2', []]],
    );
    assert.deepEqual(alunos[0].professores[0].disciplinas, ['Matemática']);
    assert.deepEqual((await ok(api('get', '/api/conversas/contatos', 'R2'), 200)).alunos, []);
  });

  it('escola vê só responsáveis autorizados do aluno; professor só de alunos dele', async () => {
    const { responsaveis } = await ok(api('get', `/api/conversas/contatos?alunoId=${ids.A1}`, 'P'), 200);
    assert.deepEqual(responsaveis.map((r) => r.nome), ['Usuário R1']);
    assert.equal((await api('get', `/api/conversas/contatos?alunoId=${ids.A1}`, 'Q')).status, 403);
    assert.equal((await api('get', '/api/conversas/contatos')).status, 400);
  });
});

describe('Iniciar conversa', () => {
  it('responsável inicia com a secretaria', async () => {
    const res = await api('post', '/api/conversas', 'R1').send({
      alunoId: ids.A1, canal: 'SECRETARIA', assunto: 'Transporte escolar', mensagem: 'Olá, como funciona a van?',
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const { conversa } = res.body.data;
    assert.equal(conversa.canal, 'SECRETARIA');
    assert.equal(conversa.professor, null);
    assert.equal(conversa.mensagens.length, 1);
    assert.equal(conversa.mensagens[0].minha, true);
    assert.equal(conversa.mensagens[0].lado, 'RESPONSAVEL');
    ids.SEC = conversa.id;
  });

  it('responsável inicia com professor do filho; professor de fora é recusado', async () => {
    const { conversa } = await ok(
      api('post', '/api/conversas', 'R1').send({
        alunoId: ids.A1, canal: 'PROFESSOR', professorId: ids.P, assunto: 'Dúvida de lição', mensagem: 'Qual a página?',
      }),
    );
    assert.equal(conversa.professor.nome, 'Usuário P');
    ids.PROF = conversa.id;

    const fora = await api('post', '/api/conversas', 'R1').send({
      alunoId: ids.A1, canal: 'PROFESSOR', professorId: ids.Q, assunto: 'Dúvida', mensagem: 'Oi',
    });
    assert.equal(fora.status, 400);
    assert.equal(fora.body.errors[0].field, 'professorId');
    const semProfessor = await api('post', '/api/conversas', 'R1').send({ alunoId: ids.A1, canal: 'PROFESSOR', assunto: 'Dúvida', mensagem: 'Oi' });
    assert.equal(semProfessor.status, 400);
  });

  it('responsável não autorizado ou de outro aluno não inicia', async () => {
    const body = { alunoId: ids.A1, canal: 'SECRETARIA', assunto: 'Assunto', mensagem: 'Oi' };
    assert.equal((await api('post', '/api/conversas', 'R2').send(body)).status, 403);
  });

  it('professor inicia com responsável de aluno dele; não com não autorizado nem aluno de fora', async () => {
    const { conversa } = await ok(
      api('post', '/api/conversas', 'P').send({ alunoId: ids.A1, responsavelId: ids.R1, assunto: 'Comportamento', mensagem: 'Podemos conversar?' }),
    );
    assert.equal(conversa.canal, 'PROFESSOR');
    assert.equal(conversa.professor.id, ids.P);
    ids.PROF2 = conversa.id;

    const naoAutorizado = await api('post', '/api/conversas', 'P').send({ alunoId: ids.A1, responsavelId: ids.R2, assunto: 'Assunto', mensagem: 'Oi' });
    assert.equal(naoAutorizado.status, 400);
    assert.equal(naoAutorizado.body.errors[0].field, 'responsavelId');
    const alunoDeFora = await api('post', '/api/conversas', 'P').send({ alunoId: ids.A2, responsavelId: ids.R1, assunto: 'Assunto', mensagem: 'Oi' });
    assert.equal(alunoDeFora.status, 403);
  });

  it('admin inicia pela secretaria com qualquer aluno ativo', async () => {
    const { conversa } = await ok(
      api('post', '/api/conversas').send({ alunoId: ids.A2, responsavelId: ids.R1, assunto: 'Documentação', mensagem: 'Falta o RG.' }),
    );
    assert.equal(conversa.canal, 'SECRETARIA');
  });

  it('valida assunto e mensagem', async () => {
    const base = { alunoId: ids.A1, canal: 'SECRETARIA' };
    assert.equal((await api('post', '/api/conversas', 'R1').send({ ...base, assunto: 'Oi', mensagem: 'x' })).status, 400);
    assert.equal((await api('post', '/api/conversas', 'R1').send({ ...base, assunto: 'Assunto', mensagem: '   ' })).status, 400);
    const { rowCount } = await pool.query("SELECT 1 FROM conversas WHERE assunto = 'Oi'");
    assert.equal(rowCount, 0);
  });
});

describe('Visibilidade, mensagens e leitura', () => {
  it('cada um vê só as próprias conversas; admin não vê conversa de professor', async () => {
    const assuntos = async (who) => (await ok(api('get', '/api/conversas', who), 200)).items.map((c) => c.assunto).sort();
    assert.deepEqual(await assuntos('R1'), ['Comportamento', 'Documentação', 'Dúvida de lição', 'Transporte escolar']);
    assert.deepEqual(await assuntos('P'), ['Comportamento', 'Dúvida de lição']);
    assert.deepEqual(await assuntos('admin'), ['Documentação', 'Transporte escolar']);
    assert.deepEqual(await assuntos('ADMIN2'), ['Documentação', 'Transporte escolar']);
    assert.deepEqual(await assuntos('Q'), []);
    assert.deepEqual(await assuntos('R2'), []);

    assert.equal((await api('get', `/api/conversas/${ids.PROF}`)).status, 404);
    assert.equal((await api('get', `/api/conversas/${ids.SEC}`, 'R2')).status, 404);
    assert.equal((await api('post', `/api/conversas/${ids.PROF}/mensagens`, 'Q').send({ conteudo: 'oi' })).status, 404);
  });

  it('não lidas por lado; qualquer admin lendo zera a da secretaria', async () => {
    assert.equal(await naoLidas('admin', ids.SEC), 1);
    assert.equal(await naoLidas('ADMIN2', ids.SEC), 1);
    assert.equal(await naoLidas('R1', ids.SEC), 0, 'a própria mensagem não conta como não lida');

    await ok(api('post', `/api/conversas/${ids.SEC}/lida`, 'ADMIN2'), 200);
    assert.equal(await naoLidas('admin', ids.SEC), 0);

    const pendentes = await ok(api('get', '/api/conversas?naoLidas=true'), 200);
    assert.ok(!pendentes.items.some((c) => c.id === ids.SEC));
  });

  it('responder sobe a conversa, conta como não lida para o outro lado e mostra a leitura', async () => {
    const res = await api('post', `/api/conversas/${ids.SEC}/mensagens`).send({ conteudo: 'A van passa às 6h40.' });
    assert.equal(res.status, 201);
    const { conversa } = res.body.data;
    assert.equal(conversa.mensagens.length, 2);
    assert.equal(conversa.mensagens[1].lado, 'ESCOLA');
    assert.equal(conversa.mensagens[1].autor.nome, 'Administrador EscolaAvis');

    const lista = (await ok(api('get', '/api/conversas', 'R1'), 200)).items;
    assert.equal(lista[0].id, ids.SEC, 'conversa respondida vai para o topo');
    assert.equal(lista[0].naoLidas, 1);
    assert.equal(lista[0].ultimaMensagem.conteudo, 'A van passa às 6h40.');

    // A mensagem do responsável já foi lida pela escola (ADMIN2 marcou antes).
    const visto = await ok(api('get', `/api/conversas/${ids.SEC}`, 'R1'), 200);
    assert.ok(visto.conversa.lidaPeloOutroLadoEm >= visto.conversa.mensagens[0].enviadaEm);

    await ok(api('post', `/api/conversas/${ids.SEC}/lida`, 'R1'), 200);
    assert.equal(await naoLidas('R1', ids.SEC), 0);
  });

  it('id inválido responde 404 e exige login', async () => {
    assert.equal((await api('get', '/api/conversas/nao-e-uuid', 'R1')).status, 404);
    assert.equal((await request(app).get('/api/conversas')).status, 401);
  });
});
