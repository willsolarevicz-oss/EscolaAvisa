import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

const app = createApp();
let adminToken;

async function tokenFor(credentials) {
  const res = await request(app).post('/api/auth/login').send(credentials);
  assert.equal(res.status, 200);
  return res.body.data.token;
}

function api(method, url, token = adminToken) {
  return request(app)[method](url).set('Authorization', `Bearer ${token}`);
}

let seq = 0;
async function criarTurma(overrides = {}) {
  seq += 1;
  const res = await api('post', '/api/turmas').send({
    nome: `Turma ${seq}`,
    anoLetivo: 2026,
    turno: 'MATUTINO',
    ...overrides,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data.turma;
}

async function criarAluno(nome) {
  seq += 1;
  const res = await api('post', '/api/alunos').send({ nome, dataNascimento: '2014-06-01', matricula: `TT-${seq}` });
  assert.equal(res.status, 201);
  return res.body.data.aluno;
}

async function criarDisciplina(nome) {
  const res = await api('post', '/api/disciplinas').send({ nome });
  assert.equal(res.status, 201);
  return res.body.data.disciplina;
}

before(async () => {
  await resetDatabase();
  adminToken = await tokenFor({ email: 'admin@escolaavis.com', senha: 'Admin@123' });
});

after(async () => {
  await pool.end();
});

describe('Cadastro de turmas', () => {
  it('é exclusivo de ADMIN', async () => {
    assert.equal((await request(app).get('/api/turmas')).status, 401);
    await createUser({ email: 'prof.turmas@escolaavis.com', senha: 'Prof@1234', tipoUsuario: 'PROFESSOR' });
    const profToken = await tokenFor({ email: 'prof.turmas@escolaavis.com', senha: 'Prof@1234' });
    assert.equal((await api('get', '/api/turmas', profToken)).status, 403);
  });

  it('cadastra turma (201) com contadores zerados', async () => {
    const turma = await criarTurma({ nome: ' 6º Ano A ', descricao: 'Sala 12' });
    assert.equal(turma.nome, '6º Ano A');
    assert.equal(turma.anoLetivo, 2026);
    assert.equal(turma.turno, 'MATUTINO');
    assert.equal(turma.totalAlunos, 0);
    assert.equal(turma.totalProfessores, 0);
  });

  it('recusa nome repetido no mesmo ano e turno (409), aceita outro turno', async () => {
    const dup = await api('post', '/api/turmas').send({ nome: '6º ANO A', anoLetivo: 2026, turno: 'MATUTINO' });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.errors[0].field, 'nome');
    await criarTurma({ nome: '6º Ano A', turno: 'VESPERTINO' });
  });

  it('valida ano letivo e turno', async () => {
    const casos = [
      [{ anoLetivo: 1999 }, 'anoLetivo'],
      [{ anoLetivo: '2026' }, 'anoLetivo'],
      [{ turno: 'MADRUGADA' }, 'turno'],
      [{ nome: '' }, 'nome'],
    ];
    for (const [override, field] of casos) {
      const res = await api('post', '/api/turmas').send({ nome: 'X', anoLetivo: 2026, turno: 'NOTURNO', ...override });
      assert.equal(res.status, 400, JSON.stringify(override));
      assert.equal(res.body.errors[0].field, field);
    }
  });

  it('lista com filtros de ano e turno, mais recentes primeiro', async () => {
    await criarTurma({ nome: 'Filtro 2025', anoLetivo: 2025, turno: 'NOTURNO' });
    await criarTurma({ nome: 'Filtro 2026', anoLetivo: 2026, turno: 'NOTURNO' });

    const noturno = await api('get', '/api/turmas?turno=NOTURNO&busca=filtro');
    assert.deepEqual(noturno.body.data.items.map((t) => t.nome), ['Filtro 2026', 'Filtro 2025']);

    const ano = await api('get', '/api/turmas?anoLetivo=2025');
    assert.deepEqual(ano.body.data.items.map((t) => t.nome), ['Filtro 2025']);

    assert.equal((await api('get', '/api/turmas?anoLetivo=abc')).status, 400);
  });
});

describe('Matrícula de alunos', () => {
  let turmaA;
  let turmaB;
  let aluno;

  before(async () => {
    turmaA = await criarTurma({ nome: '7º Ano A' });
    turmaB = await criarTurma({ nome: '7º Ano B' });
    aluno = await criarAluno('Bruna Matrícula');
  });

  it('matricula aluno ativo (201) e atualiza o contador', async () => {
    const res = await api('post', `/api/turmas/${turmaA.id}/alunos`).send({ alunoId: aluno.id });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.data.alunos.map((m) => m.aluno.nome), ['Bruna Matrícula']);
    assert.equal(res.body.data.transferidoDe, null);

    const turma = await api('get', `/api/turmas/${turmaA.id}`);
    assert.equal(turma.body.data.turma.totalAlunos, 1);

    const detalheAluno = await api('get', `/api/alunos/${aluno.id}`);
    assert.deepEqual(detalheAluno.body.data.aluno.turmas.map((t) => t.nome), ['7º Ano A']);
  });

  it('recusa matricular de novo na mesma turma (409)', async () => {
    const res = await api('post', `/api/turmas/${turmaA.id}/alunos`).send({ alunoId: aluno.id });
    assert.equal(res.status, 409);
    assert.equal(res.body.message, 'Este aluno já está matriculado nesta turma.');
  });

  it('outra turma do mesmo ano exige confirmar a transferência (409 com campo "transferir")', async () => {
    const res = await api('post', `/api/turmas/${turmaB.id}/alunos`).send({ alunoId: aluno.id });
    assert.equal(res.status, 409);
    assert.equal(res.body.errors[0].field, 'transferir');
    assert.match(res.body.message, /7º Ano A/);
  });

  it('transferência encerra a matrícula antiga e cria a nova (mesma transação)', async () => {
    const res = await api('post', `/api/turmas/${turmaB.id}/alunos`).send({ alunoId: aluno.id, transferir: true });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.data.transferidoDe, { id: turmaA.id, nome: '7º Ano A' });
    assert.equal(res.body.message, 'Aluno transferido da turma 7º Ano A.');

    const a = await api('get', `/api/turmas/${turmaA.id}/alunos`);
    const b = await api('get', `/api/turmas/${turmaB.id}/alunos`);
    assert.equal(a.body.data.alunos.length, 0);
    assert.equal(b.body.data.alunos.length, 1);

    // Histórico preservado: a matrícula antiga continua no banco, inativa.
    const { rows } = await pool.query(
      'SELECT turma_id, ativo FROM aluno_turma WHERE aluno_id = $1 ORDER BY ativo',
      [aluno.id],
    );
    assert.deepEqual(rows, [
      { turma_id: turmaA.id, ativo: false },
      { turma_id: turmaB.id, ativo: true },
    ]);
  });

  it('voltar para uma turma anterior reativa a matrícula antiga', async () => {
    const res = await api('post', `/api/turmas/${turmaA.id}/alunos`).send({ alunoId: aluno.id, transferir: true });
    assert.equal(res.status, 201);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM aluno_turma WHERE aluno_id = $1', [aluno.id]);
    assert.equal(rows[0].total, 2, 'não deve criar uma terceira linha');
  });

  it('turma de outro ano não conflita', async () => {
    const turma2027 = await criarTurma({ nome: '8º Ano A', anoLetivo: 2027 });
    const res = await api('post', `/api/turmas/${turma2027.id}/alunos`).send({ alunoId: aluno.id });
    assert.equal(res.status, 201);
    const detalhe = await api('get', `/api/alunos/${aluno.id}`);
    assert.deepEqual(detalhe.body.data.aluno.turmas.map((t) => t.anoLetivo), [2027, 2026]);
  });

  it('encerra a matrícula (DELETE) e responde 404 se não estiver matriculado', async () => {
    const res = await api('delete', `/api/turmas/${turmaA.id}/alunos/${aluno.id}`);
    assert.equal(res.status, 200);
    assert.equal((await api('delete', `/api/turmas/${turmaA.id}/alunos/${aluno.id}`)).status, 404);
  });

  it('recusa aluno inativo, aluno inexistente e turma inativa', async () => {
    const inativo = await criarAluno('Aluno Inativo');
    await api('patch', `/api/alunos/${inativo.id}/ativo`).send({ ativo: false });
    const r1 = await api('post', `/api/turmas/${turmaA.id}/alunos`).send({ alunoId: inativo.id });
    assert.equal(r1.status, 400);
    assert.equal(r1.body.errors[0].field, 'alunoId');

    const r2 = await api('post', `/api/turmas/${turmaA.id}/alunos`).send({ alunoId: '00000000-0000-4000-8000-000000000000' });
    assert.equal(r2.status, 400);

    const fechada = await criarTurma({ nome: 'Turma Fechada' });
    await api('patch', `/api/turmas/${fechada.id}/ativo`).send({ ativo: false });
    const outro = await criarAluno('Outro Aluno');
    const r3 = await api('post', `/api/turmas/${fechada.id}/alunos`).send({ alunoId: outro.id });
    assert.equal(r3.status, 400);
  });

  it('não permite mudar o ano letivo de turma com matrículas', async () => {
    const res = await api('put', `/api/turmas/${turmaB.id}`).send({ nome: '7º Ano B', anoLetivo: 2027, turno: 'MATUTINO' });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].field, 'anoLetivo');

    // Mudar só o nome continua permitido.
    const ok = await api('put', `/api/turmas/${turmaB.id}`).send({ nome: '7º Ano B (Manhã)', anoLetivo: 2026, turno: 'MATUTINO' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.turma.nome, '7º Ano B (Manhã)');
  });
});

describe('Professores da turma', () => {
  let turma;
  let professor;
  let matematica;

  before(async () => {
    turma = await criarTurma({ nome: '9º Ano A' });
    professor = await createUser({ nome: 'Paulo Professor', email: 'paulo.prof@escolaavis.com', tipoUsuario: 'PROFESSOR' });
    matematica = await criarDisciplina('Matemática');
  });

  it('atribui professor + disciplina (201) e recusa duplicata (409)', async () => {
    const res = await api('post', `/api/turmas/${turma.id}/professores`).send({
      professorId: professor.id,
      disciplinaId: matematica.id,
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.atribuicao.professor.nome, 'Paulo Professor');
    assert.equal(res.body.data.atribuicao.disciplina.nome, 'Matemática');

    const dup = await api('post', `/api/turmas/${turma.id}/professores`).send({
      professorId: professor.id,
      disciplinaId: matematica.id,
    });
    assert.equal(dup.status, 409);

    const detalhe = await api('get', `/api/turmas/${turma.id}`);
    assert.equal(detalhe.body.data.turma.totalProfessores, 1);
    assert.equal(detalhe.body.data.turma.professores.length, 1);
  });

  it('valida perfil do professor e disciplina ativa', async () => {
    const responsavel = await createUser({ email: 'resp.turma@escolaavis.com', tipoUsuario: 'RESPONSAVEL' });
    const r1 = await api('post', `/api/turmas/${turma.id}/professores`).send({
      professorId: responsavel.id,
      disciplinaId: matematica.id,
    });
    assert.equal(r1.status, 400);
    assert.deepEqual(r1.body.errors[0], { field: 'professorId', message: 'O usuário selecionado não é um professor.' });

    const artes = await criarDisciplina('Artes');
    await api('patch', `/api/disciplinas/${artes.id}/ativo`).send({ ativo: false });
    const r2 = await api('post', `/api/turmas/${turma.id}/professores`).send({
      professorId: professor.id,
      disciplinaId: artes.id,
    });
    assert.equal(r2.status, 400);
    assert.equal(r2.body.errors[0].field, 'disciplinaId');
  });

  it('remove atribuição e não aceita atribuição de outra turma (404)', async () => {
    const lista = await api('get', `/api/turmas/${turma.id}/professores`);
    const atribuicao = lista.body.data.professores[0];
    const outraTurma = await criarTurma({ nome: 'Outra' });

    assert.equal((await api('delete', `/api/turmas/${outraTurma.id}/professores/${atribuicao.id}`)).status, 404);
    assert.equal((await api('delete', `/api/turmas/${turma.id}/professores/${atribuicao.id}`)).status, 200);
    assert.equal((await api('get', `/api/turmas/${turma.id}/professores`)).body.data.professores.length, 0);
  });
});
