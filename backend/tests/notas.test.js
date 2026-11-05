import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { calcularMedia } from '../src/services/notaService.js';
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

const gradeUrl = () => `/api/notas/turmas/${ids.T}/disciplinas/${ids.MAT}`;

/**
 * Cenário: turma T com A1 e A2; P leciona Matemática em T (Q leciona Português em T).
 * A3 fora da turma. R1 responsável autorizado de A1; R2 NÃO autorizado de A1.
 */
before(async () => {
  await resetDatabase();
  tokens.admin = await tokenFor('admin@escolaavis.com', 'Admin@123');

  for (const [key, tipoUsuario] of [['P', 'PROFESSOR'], ['Q', 'PROFESSOR'], ['R1', 'RESPONSAVEL'], ['R2', 'RESPONSAVEL']]) {
    ids[key] = (await createUser({ nome: `Usuário ${key}`, email: `${key.toLowerCase()}@notas.com`, tipoUsuario })).id;
  }
  ids.MAT = (await ok(api('post', '/api/disciplinas').send({ nome: 'Matemática' }))).disciplina.id;
  ids.POR = (await ok(api('post', '/api/disciplinas').send({ nome: 'Português' }))).disciplina.id;
  ids.HIS = (await ok(api('post', '/api/disciplinas').send({ nome: 'História' }))).disciplina.id; // não lecionada em T
  ids.T = (await ok(api('post', '/api/turmas').send({ nome: 'Turma T', anoLetivo: 2026, turno: 'MATUTINO' }))).turma.id;
  for (const [key, nome, matricula] of [['A1', 'Alice Nota', 'NT-1'], ['A2', 'Bruno Nota', 'NT-2'], ['A3', 'Carlos Fora', 'NT-3']]) {
    ids[key] = (await ok(api('post', '/api/alunos').send({ nome, dataNascimento: '2013-02-02', matricula }))).aluno.id;
  }
  await ok(api('post', `/api/turmas/${ids.T}/alunos`).send({ alunoId: ids.A1 }));
  await ok(api('post', `/api/turmas/${ids.T}/alunos`).send({ alunoId: ids.A2 }));
  await ok(api('post', `/api/turmas/${ids.T}/professores`).send({ professorId: ids.P, disciplinaId: ids.MAT }));
  await ok(api('post', `/api/turmas/${ids.T}/professores`).send({ professorId: ids.Q, disciplinaId: ids.POR }));
  await ok(api('post', `/api/alunos/${ids.A1}/responsaveis`).send({ usuarioId: ids.R1, parentesco: 'Mãe' }));
  await ok(api('post', `/api/alunos/${ids.A1}/responsaveis`).send({ usuarioId: ids.R2, parentesco: 'Pai', autorizadoReceberComunicacoes: false }));

  for (const key of ['P', 'Q', 'R1', 'R2']) tokens[key] = await tokenFor(`${key.toLowerCase()}@notas.com`);
});

after(async () => {
  await pool.end();
});

describe('Média', () => {
  it('é a média simples dos bimestres lançados, com uma casa decimal', () => {
    assert.equal(calcularMedia({ 1: 7, 2: 8, 3: null, 4: null }), 7.5);
    assert.equal(calcularMedia({ 1: 7, 2: 8, 3: 8, 4: null }), 7.7); // 7,666...
    assert.equal(calcularMedia({ 1: null, 2: null, 3: null, 4: null }), null);
  });
});

describe('Grade de lançamento', () => {
  it('professor vê só as turmas/disciplinas que leciona', async () => {
    const p = (await ok(api('get', '/api/notas/turmas', 'P'), 200)).turmas;
    assert.deepEqual(p.map((t) => [t.nome, t.disciplinas.map((d) => d.nome)]), [['Turma T', ['Matemática']]]);
    const admin = (await ok(api('get', '/api/notas/turmas'), 200)).turmas;
    assert.deepEqual(admin[0].disciplinas.map((d) => d.nome), ['Matemática', 'Português']);
  });

  it('grade traz os alunos matriculados com bimestres vazios', async () => {
    const { grade } = await ok(api('get', gradeUrl(), 'P'), 200);
    assert.equal(grade.disciplina.nome, 'Matemática');
    assert.deepEqual(grade.alunos.map((a) => a.aluno.nome), ['Alice Nota', 'Bruno Nota']);
    assert.deepEqual(grade.alunos[0].notas, { 1: null, 2: null, 3: null, 4: null });
    assert.equal(grade.alunos[0].media, null);
  });

  it('professor lança em lote e corrige (upsert); null apaga', async () => {
    const res = await api('put', gradeUrl(), 'P').send({
      notas: [
        { alunoId: ids.A1, bimestre: 1, valor: 7 },
        { alunoId: ids.A1, bimestre: 2, valor: 8.5 },
        { alunoId: ids.A2, bimestre: 1, valor: 5.5 },
      ],
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.message, '3 alterações salvas.');
    const alice = res.body.data.grade.alunos.find((a) => a.aluno.id === ids.A1);
    assert.deepEqual(alice.notas, { 1: 7, 2: 8.5, 3: null, 4: null });
    assert.equal(alice.media, 7.8); // 7,75 arredonda para 7,8

    const corrigir = await ok(
      api('put', gradeUrl(), 'P').send({ notas: [{ alunoId: ids.A1, bimestre: 2, valor: 9 }, { alunoId: ids.A2, bimestre: 1, valor: null }] }),
      200,
    );
    const depois = Object.fromEntries(corrigir.grade.alunos.map((a) => [a.aluno.nome, a.notas]));
    assert.deepEqual(depois['Alice Nota'], { 1: 7, 2: 9, 3: null, 4: null });
    assert.deepEqual(depois['Bruno Nota'], { 1: null, 2: null, 3: null, 4: null });

    const { rows } = await pool.query('SELECT lancado_por FROM notas WHERE aluno_id = $1 AND bimestre = 2', [ids.A1]);
    assert.equal(rows[0].lancado_por, ids.P);
  });

  it('valida faixa, casas decimais, bimestre e repetição', async () => {
    const casos = [
      { alunoId: ids.A1, bimestre: 1, valor: 10.5 },
      { alunoId: ids.A1, bimestre: 1, valor: -1 },
      { alunoId: ids.A1, bimestre: 1, valor: 7.25 },
      { alunoId: ids.A1, bimestre: 5, valor: 7 },
      { alunoId: ids.A1, bimestre: 1, valor: '7' },
    ];
    for (const nota of casos) {
      const res = await api('put', gradeUrl(), 'P').send({ notas: [nota] });
      assert.equal(res.status, 400, JSON.stringify(nota));
    }
    const repetida = await api('put', gradeUrl(), 'P').send({
      notas: [{ alunoId: ids.A1, bimestre: 3, valor: 6 }, { alunoId: ids.A1, bimestre: 3, valor: 7 }],
    });
    assert.equal(repetida.status, 400);
  });

  it('aluno fora da turma é recusado e nada do lote é gravado', async () => {
    const res = await api('put', gradeUrl(), 'P').send({
      notas: [{ alunoId: ids.A2, bimestre: 4, valor: 6 }, { alunoId: ids.A3, bimestre: 4, valor: 6 }],
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].message, '1 aluno não tem matrícula ativa nesta turma.');
    const { rowCount } = await pool.query('SELECT 1 FROM notas WHERE bimestre = 4');
    assert.equal(rowCount, 0);
  });

  it('permissões: outro professor 403; disciplina não lecionada 404; responsável 403', async () => {
    assert.equal((await api('get', gradeUrl(), 'Q')).status, 403);
    assert.equal((await api('put', gradeUrl(), 'Q').send({ notas: [{ alunoId: ids.A1, bimestre: 1, valor: 1 }] })).status, 403);
    assert.equal((await api('get', `/api/notas/turmas/${ids.T}/disciplinas/${ids.HIS}`)).status, 404);
    assert.equal((await api('get', '/api/notas/turmas', 'R1')).status, 403);
  });

  it('admin também lança (correção)', async () => {
    const res = await api('put', gradeUrl()).send({ notas: [{ alunoId: ids.A1, bimestre: 3, valor: 10 }] });
    assert.equal(res.status, 200);
  });
});

describe('Boletim do responsável', () => {
  it('responsável autorizado vê notas e média por disciplina da turma', async () => {
    const { boletins } = await ok(api('get', '/api/me/boletim', 'R1'), 200);
    assert.equal(boletins.length, 1);
    assert.equal(boletins[0].aluno.nome, 'Alice Nota');
    assert.equal(boletins[0].turma.nome, 'Turma T');
    const porDisciplina = Object.fromEntries(boletins[0].disciplinas.map((d) => [d.disciplina.nome, d]));
    assert.deepEqual(Object.keys(porDisciplina), ['Matemática', 'Português']);
    assert.deepEqual(porDisciplina['Matemática'].notas, { 1: 7, 2: 9, 3: 10, 4: null });
    assert.equal(porDisciplina['Matemática'].media, 8.7);
    assert.equal(porDisciplina['Português'].media, null);
  });

  it('responsável não autorizado não vê boletim', async () => {
    const { boletins } = await ok(api('get', '/api/me/boletim', 'R2'), 200);
    assert.deepEqual(boletins, []);
  });

  it('só responsáveis acessam /api/me/boletim', async () => {
    assert.equal((await api('get', '/api/me/boletim', 'P')).status, 403);
  });
});
