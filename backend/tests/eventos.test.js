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

const criar = (who, body) => api('post', '/api/eventos', who).send({ tipo: 'PROVA', ...body });
const titulosDoMes = async (who, mes = '2026-11') =>
  (await ok(api('get', `/api/calendario?mes=${mes}`, who), 200)).eventos.map((e) => e.titulo);

/** Simula a BrasilAPI (os testes nunca acessam a internet). */
function mockBrasilApi(handler) {
  return mock.method(globalThis, 'fetch', async (url) => handler(String(url)));
}
const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Cenário: turmas TA (P leciona) e TB (Q leciona). A1 em TA, A2 em TB.
 * R1 autorizado de A1; R2 NÃO autorizado de A2.
 */
before(async () => {
  await resetDatabase();
  tokens.admin = await tokenFor('admin@escolaavis.com', 'Admin@123');

  for (const [key, tipoUsuario] of [['P', 'PROFESSOR'], ['Q', 'PROFESSOR'], ['R1', 'RESPONSAVEL'], ['R2', 'RESPONSAVEL']]) {
    ids[key] = (await createUser({ nome: `Usuário ${key}`, email: `${key.toLowerCase()}@eventos.com`, tipoUsuario })).id;
  }
  const disc = (await ok(api('post', '/api/disciplinas').send({ nome: 'Matemática' }))).disciplina.id;
  for (const key of ['TA', 'TB']) {
    ids[key] = (await ok(api('post', '/api/turmas').send({ nome: `Turma ${key}`, anoLetivo: 2026, turno: 'MATUTINO' }))).turma.id;
  }
  for (const [key, matricula] of [['A1', 'EV-1'], ['A2', 'EV-2']]) {
    ids[key] = (await ok(api('post', '/api/alunos').send({ nome: `Aluno ${key}`, dataNascimento: '2013-02-02', matricula }))).aluno.id;
  }
  await ok(api('post', `/api/turmas/${ids.TA}/alunos`).send({ alunoId: ids.A1 }));
  await ok(api('post', `/api/turmas/${ids.TB}/alunos`).send({ alunoId: ids.A2 }));
  await ok(api('post', `/api/turmas/${ids.TA}/professores`).send({ professorId: ids.P, disciplinaId: disc }));
  await ok(api('post', `/api/turmas/${ids.TB}/professores`).send({ professorId: ids.Q, disciplinaId: disc }));
  await ok(api('post', `/api/alunos/${ids.A1}/responsaveis`).send({ usuarioId: ids.R1, parentesco: 'Mãe' }));
  await ok(
    api('post', `/api/alunos/${ids.A2}/responsaveis`).send({ usuarioId: ids.R2, parentesco: 'Pai', autorizadoReceberComunicacoes: false }),
  );

  for (const key of ['P', 'Q', 'R1', 'R2']) tokens[key] = await tokenFor(`${key.toLowerCase()}@eventos.com`);
});

beforeEach(() => clearFeriadosCache());
afterEach(() => mock.restoreAll());

after(async () => {
  await pool.end();
});

describe('Cadastro de eventos', () => {
  it('admin cria evento da escola toda; sem data de fim vira evento de um dia', async () => {
    const { evento } = await ok(criar('admin', { titulo: 'Reunião de pais', tipo: 'REUNIAO', dataInicio: '2026-11-10' }));
    assert.equal(evento.dataFim, '2026-11-10');
    assert.equal(evento.turma, null);
    assert.equal(evento.podeEditar, true);
    ids.ESCOLA = evento.id;
  });

  it('professor cria evento só para turma em que leciona', async () => {
    const { evento } = await ok(criar('P', { titulo: 'Prova de frações', dataInicio: '2026-11-20', turmaId: ids.TA }));
    assert.equal(evento.turma.nome, 'Turma TA');
    ids.PROVA_TA = evento.id;

    assert.equal((await criar('P', { titulo: 'Prova B', dataInicio: '2026-11-20', turmaId: ids.TB })).status, 403);
    const semTurma = await criar('P', { titulo: 'Festa', dataInicio: '2026-11-20' });
    assert.equal(semTurma.status, 400);
    assert.equal(semTurma.body.errors[0].field, 'turmaId');
  });

  it('valida datas, tipo e título', async () => {
    const casos = [
      { titulo: 'Fim antes', dataInicio: '2026-11-10', dataFim: '2026-11-09' },
      { titulo: 'Longo demais', dataInicio: '2026-01-01', dataFim: '2026-06-01' },
      { titulo: 'Data ruim', dataInicio: '2026-02-30' },
      { titulo: 'Tipo ruim', dataInicio: '2026-11-10', tipo: 'FESTA' },
      { titulo: 'X', dataInicio: '2026-11-10' },
    ];
    for (const body of casos) {
      assert.equal((await criar('admin', body)).status, 400, JSON.stringify(body));
    }
  });

  it('professor edita/exclui só os próprios; outro professor recebe 404', async () => {
    const url = `/api/eventos/${ids.PROVA_TA}`;
    assert.equal((await api('get', url, 'Q')).status, 404);
    assert.equal((await api('delete', url, 'Q')).status, 404);
    assert.equal((await api('get', `/api/eventos/${ids.ESCOLA}`, 'P')).status, 404);

    const { evento } = await ok(
      api('put', url, 'P').send({ titulo: 'Prova de frações (adiada)', tipo: 'PROVA', dataInicio: '2026-11-24', turmaId: ids.TA }),
      200,
    );
    assert.equal(evento.dataInicio, '2026-11-24');
  });

  it('admin edita evento de professor sem mudar a autoria', async () => {
    const { evento } = await ok(
      api('put', `/api/eventos/${ids.PROVA_TA}`).send({ titulo: 'Prova de frações', tipo: 'PROVA', dataInicio: '2026-11-24', turmaId: ids.TA }),
      200,
    );
    assert.equal(evento.autor.id, ids.P);
  });

  it('responsável não cria nem edita eventos', async () => {
    assert.equal((await criar('R1', { titulo: 'Festa', dataInicio: '2026-11-10' })).status, 403);
    assert.equal((await api('delete', `/api/eventos/${ids.ESCOLA}`, 'R1')).status, 403);
  });
});

describe('Calendário', () => {
  before(async () => {
    await ok(criar('Q', { titulo: 'Prova TB', dataInicio: '2026-11-05', turmaId: ids.TB }));
    // Cruza a virada do mês: aparece em outubro e em novembro.
    await ok(criar('admin', { titulo: 'Semana de provas', dataInicio: '2026-10-28', dataFim: '2026-11-03' }));
  });

  it('cada perfil vê só o que lhe diz respeito', async () => {
    mockBrasilApi(() => jsonResponse([]));
    const todos = ['Semana de provas', 'Prova TB', 'Reunião de pais', 'Prova de frações'];
    assert.deepEqual(await titulosDoMes('admin'), todos);
    assert.deepEqual(await titulosDoMes('P'), ['Semana de provas', 'Reunião de pais', 'Prova de frações']);
    assert.deepEqual(await titulosDoMes('Q'), ['Semana de provas', 'Prova TB', 'Reunião de pais']);
    assert.deepEqual(await titulosDoMes('R1'), ['Semana de provas', 'Reunião de pais', 'Prova de frações']);
    // Responsável não autorizado vê só os eventos da escola toda.
    assert.deepEqual(await titulosDoMes('R2'), ['Semana de provas', 'Reunião de pais']);
    assert.deepEqual(await titulosDoMes('admin', '2026-10'), ['Semana de provas']);
  });

  it('podeEditar reflete a permissão de quem consulta', async () => {
    mockBrasilApi(() => jsonResponse([]));
    const { eventos } = await ok(api('get', '/api/calendario?mes=2026-11', 'P'), 200);
    const pode = Object.fromEntries(eventos.map((e) => [e.titulo, e.podeEditar]));
    assert.deepEqual(pode, { 'Semana de provas': false, 'Reunião de pais': false, 'Prova de frações': true });
  });

  it('inclui feriados do mês vindos da BrasilAPI, com cache por ano', async () => {
    const fetchMock = mockBrasilApi((url) => {
      assert.match(url, /\/feriados\/v1\/2026$/);
      return jsonResponse([
        { date: '2026-11-02', name: 'Finados', type: 'national' },
        { date: '2026-11-15', name: 'Proclamação da República', type: 'national' },
        { date: '2026-12-25', name: 'Natal', type: 'national' },
        { date: 'lixo', name: 'Inválido' },
      ]);
    });

    const data = await ok(api('get', '/api/calendario?mes=2026-11', 'R1'), 200);
    assert.equal(data.feriadosDisponiveis, true);
    assert.deepEqual(data.feriados, [
      { data: '2026-11-02', nome: 'Finados' },
      { data: '2026-11-15', nome: 'Proclamação da República' },
    ]);

    await ok(api('get', '/api/calendario?mes=2026-12', 'R1'), 200);
    assert.equal(fetchMock.mock.callCount(), 1, 'o segundo mês do mesmo ano deve vir do cache');
  });

  it('BrasilAPI fora do ar não quebra o calendário', async () => {
    mockBrasilApi(() => jsonResponse({ message: 'erro' }, 500));
    const data = await ok(api('get', '/api/calendario?mes=2026-11', 'R1'), 200);
    assert.equal(data.feriadosDisponiveis, false);
    assert.deepEqual(data.feriados, []);
    assert.equal(data.eventos.length, 3);
  });

  it('timeout/erro de rede também cai no modo sem feriados', async () => {
    mockBrasilApi(() => {
      throw new TypeError('fetch failed');
    });
    const data = await ok(api('get', '/api/calendario?mes=2026-11'), 200);
    assert.equal(data.feriadosDisponiveis, false);
  });

  it('mês inválido é recusado e exige login', async () => {
    for (const mes of ['2026-13', '2026-1', 'abc', '1999-12']) {
      assert.equal((await api('get', `/api/calendario?mes=${mes}`)).status, 400, mes);
    }
    assert.equal((await api('get', '/api/calendario')).status, 400);
    assert.equal((await request(app).get('/api/calendario?mes=2026-11')).status, 401);
  });

  it('excluir remove do calendário', async () => {
    mockBrasilApi(() => jsonResponse([]));
    const res = await api('delete', `/api/eventos/${ids.ESCOLA}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Evento excluído.');
    assert.ok(!(await titulosDoMes('admin')).includes('Reunião de pais'));
    assert.equal((await api('get', `/api/eventos/${ids.ESCOLA}`)).status, 404);
  });
});
