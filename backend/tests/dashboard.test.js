import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, describe, it, mock } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { clearFeriadosCache } from '../src/services/feriadoService.js';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

const app = createApp();
const SENHA = 'Senha@123';
const tokens = {};
const ids = {};

// Mesma noção de "hoje" da API (data local do servidor).
const hoje = new Date().toLocaleDateString('sv-SE');
const ano = Number(hoje.slice(0, 4));
function somarDias(data, dias) {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

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

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const mockBrasilApi = (porAno) =>
  mock.method(globalThis, 'fetch', async (url) => {
    const anoPedido = Number(String(url).match(/(\d{4})$/)[1]);
    return porAno[anoPedido] ? jsonResponse(porAno[anoPedido]) : jsonResponse({ message: 'erro' }, 500);
  });

/** Turma T (P leciona) com A1; R1 responsável autorizado de A1. Q leciona em T2. */
before(async () => {
  await resetDatabase();
  tokens.admin = await tokenFor('admin@escolaavis.com', 'Admin@123');
  for (const [key, tipoUsuario] of [['P', 'PROFESSOR'], ['Q', 'PROFESSOR'], ['R1', 'RESPONSAVEL']]) {
    ids[key] = (await createUser({ nome: `Usuário ${key}`, email: `${key.toLowerCase()}@dash.com`, tipoUsuario })).id;
  }
  const disc = (await ok(api('post', '/api/disciplinas').send({ nome: 'Matemática' }))).disciplina.id;
  ids.T = (await ok(api('post', '/api/turmas').send({ nome: 'Turma T', anoLetivo: ano, turno: 'MATUTINO' }))).turma.id;
  ids.T2 = (await ok(api('post', '/api/turmas').send({ nome: 'Turma T2', anoLetivo: ano, turno: 'NOTURNO' }))).turma.id;
  ids.A1 = (await ok(api('post', '/api/alunos').send({ nome: 'Aluno A1', dataNascimento: '2013-02-02', matricula: 'DB-1' }))).aluno.id;
  await ok(api('post', `/api/turmas/${ids.T}/alunos`).send({ alunoId: ids.A1 }));
  await ok(api('post', `/api/turmas/${ids.T}/professores`).send({ professorId: ids.P, disciplinaId: disc }));
  await ok(api('post', `/api/turmas/${ids.T2}/professores`).send({ professorId: ids.Q, disciplinaId: disc }));
  await ok(api('post', `/api/alunos/${ids.A1}/responsaveis`).send({ usuarioId: ids.R1, parentesco: 'Mãe' }));
  for (const key of ['P', 'Q', 'R1']) tokens[key] = await tokenFor(`${key.toLowerCase()}@dash.com`);
});

beforeEach(() => clearFeriadosCache());
afterEach(() => mock.restoreAll());
after(async () => {
  await pool.end();
});

describe('Contadores', () => {
  it('começam zerados; responsável recebe também avisos e ocorrências', async () => {
    assert.deepEqual(await ok(api('get', '/api/me/contadores', 'R1'), 200), {
      mensagensNaoLidas: 0,
      avisosNaoLidos: 0,
      ocorrenciasPendentes: 0,
    });
    assert.deepEqual(await ok(api('get', '/api/me/contadores', 'P'), 200), { mensagensNaoLidas: 0 });
    assert.deepEqual(await ok(api('get', '/api/me/contadores'), 200), { mensagensNaoLidas: 0 });
    assert.equal((await request(app).get('/api/me/contadores')).status, 401);
  });

  it('refletem aviso, ocorrência e mensagem novos e baixam ao ler', async () => {
    const aviso = (await ok(api('post', '/api/avisos').send({ titulo: 'Reunião', conteudo: 'Sexta', publico: 'TODOS' }))).aviso;
    const ocorrencia = (
      await ok(api('post', '/api/ocorrencias', 'P').send({ alunoId: ids.A1, tipo: 'ELOGIO', descricao: 'Ajudou colegas', dataOcorrencia: hoje }))
    ).ocorrencia;
    const conversa = (
      await ok(api('post', '/api/conversas', 'P').send({ alunoId: ids.A1, responsavelId: ids.R1, assunto: 'Lição', mensagem: 'Olá!' }))
    ).conversa;

    assert.deepEqual(await ok(api('get', '/api/me/contadores', 'R1'), 200), {
      mensagensNaoLidas: 1,
      avisosNaoLidos: 1,
      ocorrenciasPendentes: 1,
    });
    // Quem enviou não tem pendência.
    assert.deepEqual(await ok(api('get', '/api/me/contadores', 'P'), 200), { mensagensNaoLidas: 0 });

    await ok(api('post', `/api/me/avisos/${aviso.id}/visualizar`, 'R1'), 200);
    await ok(api('post', `/api/me/ocorrencias/${ocorrencia.id}/ciencia`, 'R1'), 200);
    await ok(api('post', `/api/conversas/${conversa.id}/lida`, 'R1'), 200);
    assert.deepEqual(await ok(api('get', '/api/me/contadores', 'R1'), 200), {
      mensagensNaoLidas: 0,
      avisosNaoLidos: 0,
      ocorrenciasPendentes: 0,
    });

    // Resposta do responsável vira pendência para o professor.
    await ok(api('post', `/api/conversas/${conversa.id}/mensagens`, 'R1').send({ conteudo: 'Oi, professor!' }));
    assert.deepEqual(await ok(api('get', '/api/me/contadores', 'P'), 200), { mensagensNaoLidas: 1 });
  });
});

describe('Próximos eventos', () => {
  before(async () => {
    const criar = (who, body) => ok(api('post', '/api/eventos', who).send({ tipo: 'EVENTO', ...body }));
    await criar('admin', { titulo: 'Já passou', dataInicio: somarDias(hoje, -10), dataFim: somarDias(hoje, -1) });
    await criar('admin', { titulo: 'Em andamento', dataInicio: somarDias(hoje, -2), dataFim: somarDias(hoje, 2) });
    await criar('admin', { titulo: 'Daqui a 20 dias', dataInicio: somarDias(hoje, 20) });
    await criar('P', { titulo: 'Prova da Turma T', tipo: 'PROVA', dataInicio: somarDias(hoje, 5), turmaId: ids.T });
    await criar('Q', { titulo: 'Prova da Turma T2', tipo: 'PROVA', dataInicio: somarDias(hoje, 3), turmaId: ids.T2 });
  });

  const titulos = async (who, query = '') =>
    (await ok(api('get', `/api/calendario/proximos${query}`, who), 200)).eventos.map((e) => e.titulo);

  it('traz o que ainda não terminou, em ordem, respeitando a visibilidade', async () => {
    mockBrasilApi({ [ano]: [], [ano + 1]: [] });
    assert.deepEqual(await titulos('admin'), ['Em andamento', 'Prova da Turma T2', 'Prova da Turma T', 'Daqui a 20 dias']);
    assert.deepEqual(await titulos('R1'), ['Em andamento', 'Prova da Turma T', 'Daqui a 20 dias']);
    assert.deepEqual(await titulos('Q'), ['Em andamento', 'Prova da Turma T2', 'Daqui a 20 dias']);
  });

  it('respeita o limite e valida o parâmetro', async () => {
    mockBrasilApi({ [ano]: [], [ano + 1]: [] });
    assert.deepEqual(await titulos('admin', '?limite=2'), ['Em andamento', 'Prova da Turma T2']);
    assert.equal((await api('get', '/api/calendario/proximos?limite=0')).status, 400);
    assert.equal((await api('get', '/api/calendario/proximos?limite=50')).status, 400);
  });

  it('próximo feriado: o primeiro a partir de hoje', async () => {
    mockBrasilApi({
      [ano]: [
        { date: `${ano}-01-01`, name: 'Confraternização Universal' },
        { date: hoje, name: 'Feriado de hoje' },
      ],
    });
    const data = await ok(api('get', '/api/calendario/proximos', 'R1'), 200);
    assert.equal(data.feriadosDisponiveis, true);
    assert.equal(data.proximoFeriado.nome, 'Feriado de hoje');
  });

  it('depois do último feriado do ano, busca o do ano seguinte', async () => {
    const fetchMock = mockBrasilApi({
      [ano]: [{ date: `${ano}-01-01`, name: 'Confraternização Universal' }],
      [ano + 1]: [{ date: `${ano + 1}-01-01`, name: 'Ano Novo seguinte' }],
    });
    const data = await ok(api('get', '/api/calendario/proximos'), 200);
    assert.deepEqual(data.proximoFeriado, { data: `${ano + 1}-01-01`, nome: 'Ano Novo seguinte' });
    assert.equal(fetchMock.mock.callCount(), 2);
  });

  it('BrasilAPI fora do ar: eventos continuam, sem feriado', async () => {
    mockBrasilApi({});
    const data = await ok(api('get', '/api/calendario/proximos'), 200);
    assert.equal(data.feriadosDisponiveis, false);
    assert.equal(data.proximoFeriado, null);
    assert.equal(data.eventos.length, 4);
  });
});
