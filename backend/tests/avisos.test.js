import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

const app = createApp();
const SENHA = 'Senha@123';
const tokens = {};
let ids = {};

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
 * Cenário:
 * - Turma T (prof P leciona Matemática; prof Q não leciona) com aluno A1.
 * - A1: R1 (autorizado), R2 (NÃO autorizado a receber), R4 (usuário desativado).
 * - A2 (sem turma): R3 (autorizado).
 * - Turma V (vazia, P também leciona).
 */
before(async () => {
  await resetDatabase();
  tokens.admin = await tokenFor('admin@escolaavis.com', 'Admin@123');

  for (const [key, tipoUsuario] of [
    ['P', 'PROFESSOR'], ['Q', 'PROFESSOR'],
    ['R1', 'RESPONSAVEL'], ['R2', 'RESPONSAVEL'], ['R3', 'RESPONSAVEL'], ['R4', 'RESPONSAVEL'],
  ]) {
    const user = await createUser({ nome: `Usuário ${key}`, email: `${key.toLowerCase()}@avisos.com`, tipoUsuario });
    ids[key] = user.id;
  }

  const disciplina = (await ok(api('post', '/api/disciplinas').send({ nome: 'Matemática' }))).disciplina;
  const T = (await ok(api('post', '/api/turmas').send({ nome: 'Turma T', anoLetivo: 2026, turno: 'MATUTINO' }))).turma;
  const V = (await ok(api('post', '/api/turmas').send({ nome: 'Turma V', anoLetivo: 2026, turno: 'MATUTINO' }))).turma;
  const A1 = (await ok(api('post', '/api/alunos').send({ nome: 'Aluno Um', dataNascimento: '2015-01-01', matricula: 'AV-1' }))).aluno;
  const A2 = (await ok(api('post', '/api/alunos').send({ nome: 'Aluno Dois', dataNascimento: '2015-01-01', matricula: 'AV-2' }))).aluno;
  ids = { ...ids, T: T.id, V: V.id, A1: A1.id, A2: A2.id };

  await ok(api('post', `/api/turmas/${T.id}/alunos`).send({ alunoId: A1.id }));
  for (const turmaId of [T.id, V.id]) {
    await ok(api('post', `/api/turmas/${turmaId}/professores`).send({ professorId: ids.P, disciplinaId: disciplina.id }));
  }

  const vincular = (alunoId, usuarioId, autorizado = true) =>
    ok(api('post', `/api/alunos/${alunoId}/responsaveis`).send({
      usuarioId,
      parentesco: 'Responsável',
      autorizadoReceberComunicacoes: autorizado,
    }));
  await vincular(A1.id, ids.R1);
  await vincular(A1.id, ids.R2, false);
  await vincular(A1.id, ids.R4);
  await vincular(A2.id, ids.R3);
  // R4 é desativado depois de vinculado.
  await ok(api('patch', `/api/usuarios/${ids.R4}/ativo`).send({ ativo: false }), 200);

  for (const key of ['P', 'Q', 'R1', 'R2', 'R3']) {
    tokens[key] = await tokenFor(`${key.toLowerCase()}@avisos.com`);
  }
});

after(async () => {
  await pool.end();
});

const avisoTodos = { titulo: 'Reunião geral', conteudo: 'Sexta, 19h.\nCompareçam!', publico: 'TODOS' };

describe('Publicação de avisos', () => {
  it('admin publica para TODOS: só responsáveis ativos e autorizados', async () => {
    const res = await api('post', '/api/avisos').send(avisoTodos);
    assert.equal(res.status, 201);
    assert.equal(res.body.message, 'Aviso publicado para 2 responsáveis.');
    const { aviso } = res.body.data;
    ids.avisoTodos = aviso.id;
    assert.equal(aviso.totalDestinatarios, 2); // R1 e R3 (R2 não autorizado, R4 inativo)
    assert.equal(aviso.totalLidos, 0);
    assert.equal(aviso.conteudo, 'Sexta, 19h.\nCompareçam!');
    assert.equal(aviso.autor.nome, 'Administrador EscolaAvis');

    const detalhe = await api('get', `/api/avisos/${aviso.id}`);
    assert.deepEqual(detalhe.body.data.aviso.destinatarios.map((d) => d.usuario.nome).sort(), ['Usuário R1', 'Usuário R3']);
  });

  it('professor publica para turma em que leciona', async () => {
    const res = await api('post', '/api/avisos', 'P').send({ titulo: 'Prova', conteudo: 'Prova na terça.', publico: 'TURMA', turmaId: ids.T });
    assert.equal(res.status, 201);
    ids.avisoTurma = res.body.data.aviso.id;
    assert.equal(res.body.data.aviso.totalDestinatarios, 1); // só R1
    assert.equal(res.body.data.aviso.turma.nome, 'Turma T');
  });

  it('admin publica para um ALUNO', async () => {
    const res = await api('post', '/api/avisos').send({ titulo: 'Documentação', conteudo: 'Trazer RG.', publico: 'ALUNO', alunoId: ids.A2 });
    assert.equal(res.status, 201);
    ids.avisoAluno = res.body.data.aviso.id;
    assert.equal(res.body.data.aviso.totalDestinatarios, 1); // R3
  });

  it('professor não publica para turma alheia nem para TODOS (403)', async () => {
    const turmaAlheia = await api('post', '/api/avisos', 'Q').send({ titulo: 'Aviso alheio', conteudo: 'x', publico: 'TURMA', turmaId: ids.T });
    assert.equal(turmaAlheia.status, 403);
    const todos = await api('post', '/api/avisos', 'P').send(avisoTodos);
    assert.equal(todos.status, 403);
  });

  it('sem destinatários: 400 e nada é gravado (transação)', async () => {
    const { rows: antes } = await pool.query('SELECT COUNT(*)::int AS n FROM avisos');
    const res = await api('post', '/api/avisos', 'P').send({ titulo: 'Turma vazia', conteudo: 'x', publico: 'TURMA', turmaId: ids.V });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /Nenhum responsável receberia/);
    const { rows: depois } = await pool.query('SELECT COUNT(*)::int AS n FROM avisos');
    assert.equal(depois[0].n, antes[0].n);
  });

  it('valida coerência entre público e alvo', async () => {
    const semTurma = await api('post', '/api/avisos').send({ titulo: 'Xyz', conteudo: 'x', publico: 'TURMA' });
    assert.equal(semTurma.status, 400);
    assert.equal(semTurma.body.errors[0].field, 'turmaId');

    const todosComTurma = await api('post', '/api/avisos').send({ ...avisoTodos, turmaId: ids.T });
    assert.equal(todosComTurma.status, 400);
    assert.equal(todosComTurma.body.errors[0].field, 'turmaId');

    const tituloCurto = await api('post', '/api/avisos').send({ ...avisoTodos, titulo: 'Oi' });
    assert.equal(tituloCurto.status, 400);
  });

  it('responsáveis não publicam e não acessam a gestão (403)', async () => {
    assert.equal((await api('post', '/api/avisos', 'R1').send(avisoTodos)).status, 403);
    assert.equal((await api('get', '/api/avisos', 'R1')).status, 403);
  });
});

describe('Avisos do responsável', () => {
  it('cada responsável vê só os avisos destinados a ele', async () => {
    const r1 = await api('get', '/api/me/avisos', 'R1');
    assert.deepEqual(r1.body.data.items.map((a) => a.titulo).sort(), ['Prova', 'Reunião geral']);
    assert.ok(r1.body.data.items.every((a) => a.lido === false));

    const r3 = await api('get', '/api/me/avisos', 'R3');
    assert.deepEqual(r3.body.data.items.map((a) => a.titulo).sort(), ['Documentação', 'Reunião geral']);

    const r2 = await api('get', '/api/me/avisos', 'R2'); // não autorizado
    assert.equal(r2.body.data.pagination.total, 0);
  });

  it('aviso de outro destinatário responde 404', async () => {
    assert.equal((await api('get', `/api/me/avisos/${ids.avisoAluno}`, 'R1')).status, 404);
    assert.equal((await api('post', `/api/me/avisos/${ids.avisoAluno}/visualizar`, 'R1')).status, 404);
  });

  it('marcar como lido é idempotente e atualiza o relatório', async () => {
    const primeira = await ok(api('post', `/api/me/avisos/${ids.avisoTodos}/visualizar`, 'R1'), 200);
    assert.equal(primeira.lido, true);
    const segunda = await ok(api('post', `/api/me/avisos/${ids.avisoTodos}/visualizar`, 'R1'), 200);
    assert.equal(segunda.visualizadoEm, primeira.visualizadoEm, 'a primeira leitura deve ser preservada');

    const naoLidos = await api('get', '/api/me/avisos?naoLidos=true', 'R1');
    assert.deepEqual(naoLidos.body.data.items.map((a) => a.titulo), ['Prova']);

    const relatorio = (await api('get', `/api/avisos/${ids.avisoTodos}`)).body.data.aviso;
    assert.equal(relatorio.totalLidos, 1);
    // Quem não leu aparece primeiro.
    assert.deepEqual(relatorio.destinatarios.map((d) => [d.usuario.nome, d.lido]), [
      ['Usuário R3', false],
      ['Usuário R1', true],
    ]);
  });

  it('rotas /me são por perfil', async () => {
    assert.equal((await api('get', '/api/me/avisos')).status, 403); // admin
    assert.equal((await api('get', '/api/me/turmas', 'R1')).status, 403);
  });
});

describe('Gestão pelo professor e arquivamento', () => {
  it('professor vê apenas os próprios avisos', async () => {
    const lista = await api('get', '/api/avisos', 'P');
    assert.deepEqual(lista.body.data.items.map((a) => a.titulo), ['Prova']);
    assert.equal((await api('get', `/api/avisos/${ids.avisoTodos}`, 'P')).status, 404);
    assert.equal((await api('patch', `/api/avisos/${ids.avisoTodos}/ativo`, 'P').send({ ativo: false })).status, 404);
  });

  it('/api/me/turmas lista as turmas em que o professor leciona', async () => {
    const res = await api('get', '/api/me/turmas', 'P');
    assert.deepEqual(res.body.data.turmas.map((t) => [t.nome, t.disciplinas]), [
      ['Turma T', ['Matemática']],
      ['Turma V', ['Matemática']],
    ]);
  });

  it('aviso arquivado some para o responsável e volta ao reativar', async () => {
    await ok(api('patch', `/api/avisos/${ids.avisoTurma}/ativo`, 'P').send({ ativo: false }), 200);
    const lista = await api('get', '/api/me/avisos', 'R1');
    assert.deepEqual(lista.body.data.items.map((a) => a.titulo), ['Reunião geral']);
    assert.equal((await api('get', `/api/me/avisos/${ids.avisoTurma}`, 'R1')).status, 404);

    await ok(api('patch', `/api/avisos/${ids.avisoTurma}/ativo`, 'P').send({ ativo: true }), 200);
    const depois = await api('get', '/api/me/avisos', 'R1');
    assert.equal(depois.body.data.pagination.total, 2);
  });

  it('lista da gestão filtra por público e situação', async () => {
    const turma = await api('get', '/api/avisos?publico=TURMA');
    assert.deepEqual(turma.body.data.items.map((a) => a.titulo), ['Prova']);
    const busca = await api('get', '/api/avisos?busca=reuni');
    assert.deepEqual(busca.body.data.items.map((a) => a.titulo), ['Reunião geral']);
  });
});
