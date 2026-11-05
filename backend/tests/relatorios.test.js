import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

const app = createApp();
const SENHA = 'Senha@123';
const tokens = {};
const ids = {};

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

/**
 * Turma T: A1, A2 (P leciona Matemática, Q leciona Português). Turma T2: A3 (Q leciona Português).
 * R1 responsável de A1, R2 de A2 (ambos autorizados). A3 sem responsável.
 */
before(async () => {
  await resetDatabase();
  tokens.admin = await tokenFor('admin@escolaavis.com', 'Admin@123');
  for (const [key, tipoUsuario] of [['P', 'PROFESSOR'], ['Q', 'PROFESSOR'], ['R1', 'RESPONSAVEL'], ['R2', 'RESPONSAVEL']]) {
    ids[key] = (await createUser({ nome: `Usuário ${key}`, email: `${key.toLowerCase()}@rel.com`, tipoUsuario })).id;
  }
  ids.MAT = (await ok(api('post', '/api/disciplinas').send({ nome: 'Matemática' }))).disciplina.id;
  ids.POR = (await ok(api('post', '/api/disciplinas').send({ nome: 'Português' }))).disciplina.id;
  ids.T = (await ok(api('post', '/api/turmas').send({ nome: 'Turma T', anoLetivo: ano, turno: 'MATUTINO' }))).turma.id;
  ids.T2 = (await ok(api('post', '/api/turmas').send({ nome: 'Turma T2', anoLetivo: ano, turno: 'NOTURNO' }))).turma.id;
  for (const [key, matricula, turma] of [['A1', 'RL-1', 'T'], ['A2', 'RL-2', 'T'], ['A3', 'RL-3', 'T2']]) {
    ids[key] = (await ok(api('post', '/api/alunos').send({ nome: `Aluno ${key}`, dataNascimento: '2013-02-02', matricula }))).aluno.id;
    await ok(api('post', `/api/turmas/${ids[turma]}/alunos`).send({ alunoId: ids[key] }));
  }
  await ok(api('post', `/api/turmas/${ids.T}/professores`).send({ professorId: ids.P, disciplinaId: ids.MAT }));
  await ok(api('post', `/api/turmas/${ids.T}/professores`).send({ professorId: ids.Q, disciplinaId: ids.POR }));
  await ok(api('post', `/api/turmas/${ids.T2}/professores`).send({ professorId: ids.Q, disciplinaId: ids.POR }));
  await ok(api('post', `/api/alunos/${ids.A1}/responsaveis`).send({ usuarioId: ids.R1, parentesco: 'Mãe' }));
  await ok(api('post', `/api/alunos/${ids.A2}/responsaveis`).send({ usuarioId: ids.R2, parentesco: 'Pai' }));
  for (const key of ['P', 'Q', 'R1', 'R2']) tokens[key] = await tokenFor(`${key.toLowerCase()}@rel.com`);
});

after(async () => {
  await pool.end();
});

describe('Relatório de leitura de avisos', () => {
  before(async () => {
    // Admin para todos (R1, R2); P para a Turma T (R1, R2). R1 lê os dois; R2 não lê nada.
    const geral = (await ok(api('post', '/api/avisos').send({ titulo: 'Aviso geral', conteudo: 'x', publico: 'TODOS' }))).aviso;
    const turma = (
      await ok(api('post', '/api/avisos', 'P').send({ titulo: 'Aviso da turma', conteudo: 'x', publico: 'TURMA', turmaId: ids.T }))
    ).aviso;
    for (const aviso of [geral, turma]) await ok(api('post', `/api/me/avisos/${aviso.id}/visualizar`, 'R1'), 200);
  });

  it('admin: resumo, avisos, leitura por turma e responsáveis com pendência', async () => {
    const data = await ok(api('get', '/api/relatorios/avisos'), 200);
    assert.deepEqual(data.periodo, { inicio: `${ano}-01-01`, fim: hoje });
    assert.deepEqual(data.resumo, { avisos: 2, destinatarios: 4, lidos: 2, taxaLeitura: 0.5 });
    assert.deepEqual(data.avisos.map((a) => [a.titulo, a.lidos, a.destinatarios]).sort(), [
      ['Aviso da turma', 1, 2],
      ['Aviso geral', 1, 2],
    ]);
    assert.deepEqual(
      data.porTurma.map((t) => [t.turma.nome, t.avisos, t.taxaLeitura]),
      [['Turma T', 1, 0.5]],
    );
    assert.deepEqual(
      data.responsaveisComPendencias.map((r) => [r.usuario.nome, r.recebidos, r.naoLidos]),
      [['Usuário R2', 2, 2]],
    );
  });

  it('professor vê só os avisos dele', async () => {
    const data = await ok(api('get', '/api/relatorios/avisos', 'P'), 200);
    assert.deepEqual(data.resumo, { avisos: 1, destinatarios: 2, lidos: 1, taxaLeitura: 0.5 });
    assert.deepEqual(data.avisos.map((a) => a.titulo), ['Aviso da turma']);
  });

  it('período sem avisos tem taxa null (não 0%)', async () => {
    const amanha = somarDias(hoje, 1);
    const data = await ok(api('get', `/api/relatorios/avisos?inicio=${amanha}&fim=${amanha}`), 200);
    assert.deepEqual(data.resumo, { avisos: 0, destinatarios: 0, lidos: 0, taxaLeitura: null });
    assert.deepEqual(data.avisos, []);
  });

  it('valida o período e as permissões', async () => {
    assert.equal((await api('get', `/api/relatorios/avisos?inicio=${hoje}&fim=${somarDias(hoje, -1)}`)).status, 400);
    assert.equal((await api('get', `/api/relatorios/avisos?inicio=${somarDias(hoje, -400)}&fim=${hoje}`)).status, 400);
    assert.equal((await api('get', '/api/relatorios/avisos?inicio=2026-02-30')).status, 400);
    assert.equal((await api('get', '/api/relatorios/avisos', 'R1')).status, 403);
    assert.equal((await request(app).get('/api/relatorios/avisos')).status, 401);
  });
});

describe('Relatório de ocorrências', () => {
  before(async () => {
    const registrar = (who, alunoId, tipo) =>
      ok(api('post', '/api/ocorrencias', who).send({ alunoId, tipo, descricao: 'Registro de teste', dataOcorrencia: hoje }));
    await registrar('P', ids.A1, 'ELOGIO');
    await registrar('P', ids.A1, 'DISCIPLINAR');
    const a2 = (await registrar('Q', ids.A2, 'DISCIPLINAR')).ocorrencia;
    await registrar('Q', ids.A3, 'ATRASO');
    await ok(api('post', `/api/me/ocorrencias/${a2.id}/ciencia`, 'R2'), 200);
  });

  it('admin: totais, ciência, por tipo, por turma e alunos com mais ocorrências', async () => {
    const data = await ok(api('get', '/api/relatorios/ocorrencias'), 200);
    // A1 gera 2 pedidos de ciência (R1), A2 gera 1 (R2, que deu ciência); A3 não tem responsável.
    assert.deepEqual(data.resumo, { ocorrencias: 4, alunos: 3, responsaveis: 3, cientes: 1, taxaCiencia: 0.333 });
    assert.deepEqual(data.porTipo, [
      { tipo: 'DISCIPLINAR', total: 2 },
      { tipo: 'ATRASO', total: 1 },
      { tipo: 'ELOGIO', total: 1 },
    ]);
    assert.deepEqual(
      data.porTurma.map((t) => [t.turma?.nome, t.total, t.alunos]),
      [['Turma T', 3, 2], ['Turma T2', 1, 1]],
    );
    assert.deepEqual(data.alunos[0].aluno.nome, 'Aluno A1');
    assert.equal(data.alunos[0].total, 2);
    assert.deepEqual(data.alunos[0].tipos, ['DISCIPLINAR', 'ELOGIO']);
    assert.equal(data.alunos[0].turmaAtual, 'Turma T');
  });

  it('professor vê só as que registrou', async () => {
    const data = await ok(api('get', '/api/relatorios/ocorrencias', 'Q'), 200);
    assert.equal(data.resumo.ocorrencias, 2);
    assert.deepEqual(data.porTipo.map((t) => t.tipo), ['ATRASO', 'DISCIPLINAR']);
  });
});

describe('Relatório de notas', () => {
  before(async () => {
    const lancar = (alunoId, bimestre, valor) => ({ alunoId, bimestre, valor });
    await ok(
      api('put', `/api/notas/turmas/${ids.T}/disciplinas/${ids.MAT}`, 'P').send({
        notas: [lancar(ids.A1, 1, 4), lancar(ids.A1, 2, 5), lancar(ids.A2, 1, 8), lancar(ids.A2, 2, 9)],
      }),
      200,
    );
  });

  const url = (turma, extra = '') => `/api/relatorios/notas?turmaId=${ids[turma]}${extra}`;

  it('médias por bimestre, média da turma e alunos abaixo do corte (padrão 6,0)', async () => {
    const data = await ok(api('get', url('T'), 'P'), 200);
    assert.equal(data.notaCorte, 6);
    assert.equal(data.totalAlunos, 2);
    assert.deepEqual(data.disciplinas.map((d) => d.disciplina.nome), ['Matemática'], 'professor vê só a disciplina dele');
    const [mat] = data.disciplinas;
    assert.deepEqual(mat.bimestres, {
      1: { lancadas: 2, media: 6 },
      2: { lancadas: 2, media: 7 },
      3: { lancadas: 0, media: null },
      4: { lancadas: 0, media: null },
    });
    assert.equal(mat.alunosComNota, 2);
    assert.equal(mat.mediaTurma, 6.5); // médias dos alunos: 4,5 e 8,5
    assert.deepEqual(mat.abaixoDoCorte.map((a) => [a.nome, a.media]), [['Aluno A1', 4.5]]);
  });

  it('nota de corte informada muda quem fica abaixo (ordem: menor média primeiro)', async () => {
    const data = await ok(api('get', url('T', '&notaCorte=9')), 200);
    const mat = data.disciplinas.find((d) => d.disciplina.nome === 'Matemática');
    assert.deepEqual(mat.abaixoDoCorte.map((a) => a.nome), ['Aluno A1', 'Aluno A2']);
    const por = data.disciplinas.find((d) => d.disciplina.nome === 'Português');
    assert.equal(por.mediaTurma, null, 'disciplina sem notas não inventa média');
    assert.deepEqual(por.abaixoDoCorte, []);
  });

  it('professor só nas turmas em que leciona; valida parâmetros', async () => {
    assert.equal((await api('get', url('T2'), 'P')).status, 403);
    assert.equal((await api('get', url('T2'), 'Q')).status, 200);
    assert.equal((await api('get', url('T', '&notaCorte=10.5'))).status, 400);
    assert.equal((await api('get', url('T', '&notaCorte=7.25'))).status, 400);
    assert.equal((await api('get', '/api/relatorios/notas')).status, 400);
    assert.equal((await api('get', '/api/relatorios/notas?turmaId=00000000-0000-4000-8000-000000000000')).status, 404);
    assert.equal((await api('get', url('T'), 'R1')).status, 403);
  });
});
