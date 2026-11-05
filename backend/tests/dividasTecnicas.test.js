import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

const app = createApp();
const SENHA = 'Senha@123';
const tokens = {};
const ids = {};
const ano = new Date().getFullYear();

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

/** Turma "Ação Social" (P leciona) com João (responsável autorizado R) e Débora (sem responsável). */
before(async () => {
  await resetDatabase();
  tokens.admin = await tokenFor('admin@escolaavis.com', 'Admin@123');
  ids.P = (await createUser({ nome: 'Patrícia Professora', email: 'p@div.com', tipoUsuario: 'PROFESSOR' })).id;
  ids.Q = (await createUser({ nome: 'Quirino Professor', email: 'q@div.com', tipoUsuario: 'PROFESSOR' })).id;
  ids.R = (await createUser({ nome: 'Conceição Responsável', email: 'r@div.com', tipoUsuario: 'RESPONSAVEL' })).id;
  const disc = (await ok(api('post', '/api/disciplinas').send({ nome: 'Educação Física' }))).disciplina.id;
  ids.T = (await ok(api('post', '/api/turmas').send({ nome: 'Ação Social', anoLetivo: ano, turno: 'MATUTINO' }))).turma.id;
  ids.JOAO = (await ok(api('post', '/api/alunos').send({ nome: 'João Araújo', dataNascimento: '2013-02-02', matricula: 'DV-1' }))).aluno.id;
  ids.DEBORA = (await ok(api('post', '/api/alunos').send({ nome: 'Débora Lima', dataNascimento: '2013-03-03', matricula: 'DV-2' }))).aluno.id;
  for (const aluno of [ids.JOAO, ids.DEBORA]) await ok(api('post', `/api/turmas/${ids.T}/alunos`).send({ alunoId: aluno }));
  await ok(api('post', `/api/turmas/${ids.T}/professores`).send({ professorId: ids.P, disciplinaId: disc }));
  await ok(api('post', `/api/alunos/${ids.JOAO}/responsaveis`).send({ usuarioId: ids.R, parentesco: 'Mãe' }));
  tokens.P = await tokenFor('p@div.com');
  tokens.Q = await tokenFor('q@div.com');
  tokens.R = await tokenFor('r@div.com');
});

after(async () => {
  await pool.end();
});

describe('Busca sem acento', () => {
  const nomes = (data) => data.items.map((i) => i.nome);

  it('"joao" acha "João" e "araujo" acha "Araújo" (alunos)', async () => {
    assert.deepEqual(nomes(await ok(api('get', '/api/alunos?busca=joao'), 200)), ['João Araújo']);
    assert.deepEqual(nomes(await ok(api('get', '/api/alunos?busca=ARAUJO'), 200)), ['João Araújo']);
    assert.deepEqual(nomes(await ok(api('get', '/api/alunos?busca=débora'), 200)), ['Débora Lima']);
  });

  it('vale para usuários, turmas e disciplinas', async () => {
    assert.deepEqual(nomes(await ok(api('get', '/api/usuarios?busca=conceicao'), 200)), ['Conceição Responsável']);
    assert.deepEqual(nomes(await ok(api('get', '/api/turmas?busca=acao'), 200)), ['Ação Social']);
    assert.deepEqual(nomes(await ok(api('get', '/api/disciplinas?busca=educacao fisica'), 200)), ['Educação Física']);
  });

  it('vale para a busca de alunos do professor e continua tratando % e _ como texto', async () => {
    const alunos = await ok(api('get', '/api/me/alunos?busca=joao', 'P'), 200);
    assert.deepEqual(alunos.alunos.map((a) => a.nome), ['João Araújo']);
    assert.deepEqual(nomes(await ok(api('get', '/api/alunos?busca=%25'), 200)), []);
  });
});

describe('Minhas turmas (professor)', () => {
  it('lista os alunos da turma com quantos responsáveis podem receber comunicações', async () => {
    const data = await ok(api('get', `/api/me/turmas/${ids.T}/alunos`, 'P'), 200);
    assert.equal(data.turma.nome, 'Ação Social');
    assert.deepEqual(
      data.alunos.map((a) => [a.nome, a.responsaveisAutorizados]),
      [['Débora Lima', 0], ['João Araújo', 1]],
    );
  });

  it('outro professor 403, turma inexistente 404, admin/responsável 403', async () => {
    assert.equal((await api('get', `/api/me/turmas/${ids.T}/alunos`, 'Q')).status, 403);
    assert.equal((await api('get', '/api/me/turmas/00000000-0000-4000-8000-000000000000/alunos', 'P')).status, 404);
    assert.equal((await api('get', `/api/me/turmas/${ids.T}/alunos`)).status, 403);
    assert.equal((await api('get', `/api/me/turmas/${ids.T}/alunos`, 'R')).status, 403);
  });
});

describe('migrate:down pede confirmação', () => {
  it('sem terminal e sem --yes, recusa e não desfaz nada', async () => {
    const antes = (await pool.query('SELECT COUNT(*)::int AS n FROM pgmigrations')).rows[0].n;
    const result = spawnSync(process.execPath, [path.join(env.backendRoot, 'src/database/migrate.js'), 'down'], {
      cwd: env.backendRoot,
      env: { ...process.env, NODE_ENV: 'test' },
      input: '', // stdin sem terminal (como em script/CI)
      encoding: 'utf8',
    });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /exige confirmação\. Rode de novo com --yes/);
    const depois = (await pool.query('SELECT COUNT(*)::int AS n FROM pgmigrations')).rows[0].n;
    assert.equal(depois, antes);
  });
});
