import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

const app = createApp();
let adminToken;

async function tokenFor(credentials) {
  const res = await request(app).post('/api/auth/login').send(credentials);
  assert.equal(res.status, 200, `login falhou para ${credentials.email}`);
  return res.body.data.token;
}

function api(method, url, token = adminToken) {
  return request(app)[method](url).set('Authorization', `Bearer ${token}`);
}

let seq = 0;
function novoAluno(overrides = {}) {
  seq += 1;
  return { nome: `Aluno Teste ${seq}`, dataNascimento: '2015-03-10', matricula: `T-${seq}`, ...overrides };
}

async function criarAluno(overrides) {
  const res = await api('post', '/api/alunos').send(novoAluno(overrides));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data.aluno;
}

before(async () => {
  await resetDatabase();
  adminToken = await tokenFor({ email: 'admin@escolaavis.com', senha: 'Admin@123' });
});

after(async () => {
  await pool.end();
});

describe('Acesso a /api/alunos', () => {
  it('exige login (401) e perfil ADMIN (403)', async () => {
    assert.equal((await request(app).get('/api/alunos')).status, 401);

    await createUser({ email: 'prof.alunos@escolaavis.com', senha: 'Prof@1234', tipoUsuario: 'PROFESSOR' });
    const profToken = await tokenFor({ email: 'prof.alunos@escolaavis.com', senha: 'Prof@1234' });
    assert.equal((await api('get', '/api/alunos', profToken)).status, 403);
    assert.equal((await api('post', '/api/alunos', profToken).send(novoAluno())).status, 403);
  });
});

describe('Cadastro de alunos', () => {
  it('cria aluno (201) normalizando a matrícula', async () => {
    const res = await api('post', '/api/alunos').send({
      nome: '  Pedro Henrique  ',
      dataNascimento: '2014-12-31',
      matricula: ' mat-2026/001 ',
    });
    assert.equal(res.status, 201);
    const { aluno } = res.body.data;
    assert.equal(aluno.nome, 'Pedro Henrique');
    assert.equal(aluno.matricula, 'MAT-2026/001');
    // Sem conversão de fuso: a data volta exatamente como foi enviada.
    assert.equal(aluno.dataNascimento, '2014-12-31');
    assert.equal(aluno.ativo, true);
    assert.equal(aluno.totalResponsaveis, 0);
  });

  it('recusa matrícula repetida mesmo com outra caixa (409)', async () => {
    const res = await api('post', '/api/alunos').send(novoAluno({ matricula: 'Mat-2026/001' }));
    assert.equal(res.status, 409);
    assert.equal(res.body.errors[0].field, 'matricula');
    assert.equal(res.body.message, 'Já existe um aluno com esta matrícula.');
  });

  it('valida data de nascimento e matrícula', async () => {
    const amanha = new Date(Date.now() + 2 * 86_400_000).toLocaleDateString('sv-SE');
    const casos = [
      [{ dataNascimento: amanha }, 'dataNascimento', 'A data de nascimento não pode estar no futuro.'],
      [{ dataNascimento: '10/03/2015' }, 'dataNascimento', 'Data de nascimento inválida (use AAAA-MM-DD).'],
      [{ dataNascimento: '2015-02-30' }, 'dataNascimento', 'Data de nascimento inválida (use AAAA-MM-DD).'],
      [{ dataNascimento: '1899-12-31' }, 'dataNascimento', 'Data de nascimento inválida.'],
      [{ matricula: 'com espaço' }, 'matricula', 'Use apenas letras, números, ponto, barra e hífen na matrícula.'],
      [{ nome: 'A' }, 'nome', 'O nome deve ter pelo menos 2 caracteres.'],
    ];
    for (const [override, field, message] of casos) {
      const res = await api('post', '/api/alunos').send(novoAluno(override));
      assert.equal(res.status, 400, JSON.stringify(override));
      assert.ok(
        res.body.errors.some((e) => e.field === field && e.message === message),
        `${JSON.stringify(override)} → ${JSON.stringify(res.body.errors)}`,
      );
    }
  });

  it('edita, desativa e reativa', async () => {
    const aluno = await criarAluno();
    const editar = await api('put', `/api/alunos/${aluno.id}`).send({
      nome: 'Nome Corrigido',
      dataNascimento: '2016-01-20',
      matricula: aluno.matricula,
    });
    assert.equal(editar.status, 200);
    assert.equal(editar.body.data.aluno.nome, 'Nome Corrigido');
    assert.equal(editar.body.data.aluno.dataNascimento, '2016-01-20');

    const desativar = await api('patch', `/api/alunos/${aluno.id}/ativo`).send({ ativo: false });
    assert.equal(desativar.body.data.aluno.ativo, false);
    const reativar = await api('patch', `/api/alunos/${aluno.id}/ativo`).send({ ativo: true });
    assert.equal(reativar.body.data.aluno.ativo, true);
  });

  it('responde 404 para aluno inexistente ou id inválido', async () => {
    assert.equal((await api('get', '/api/alunos/00000000-0000-4000-8000-000000000000')).status, 404);
    assert.equal((await api('get', '/api/alunos/abc')).status, 404);
    assert.equal((await api('put', '/api/alunos/abc').send(novoAluno())).status, 404);
  });
});

describe('GET /api/alunos', () => {
  before(async () => {
    await criarAluno({ nome: 'Beatriz Busca', matricula: 'BUSCA-01' });
    await criarAluno({ nome: 'Caio Busca', matricula: 'BUSCA-02' });
    const inativo = await criarAluno({ nome: 'Davi Busca', matricula: 'BUSCA-03' });
    await api('patch', `/api/alunos/${inativo.id}/ativo`).send({ ativo: false });
  });

  it('busca por nome ou matrícula, em ordem alfabética', async () => {
    const porNome = await api('get', '/api/alunos?busca=busca');
    assert.deepEqual(porNome.body.data.items.map((a) => a.nome), ['Beatriz Busca', 'Caio Busca', 'Davi Busca']);

    const porMatricula = await api('get', '/api/alunos?busca=busca-02');
    assert.deepEqual(porMatricula.body.data.items.map((a) => a.nome), ['Caio Busca']);
  });

  it('filtra por situação e pagina', async () => {
    const inativos = await api('get', '/api/alunos?busca=busca&ativo=false');
    assert.deepEqual(inativos.body.data.items.map((a) => a.nome), ['Davi Busca']);

    const pagina = await api('get', '/api/alunos?busca=busca&pageSize=2&page=2');
    assert.equal(pagina.body.data.items.length, 1);
    assert.equal(pagina.body.data.pagination.total, 3);
    assert.equal(pagina.body.data.pagination.totalPages, 2);
  });
});

describe('Vínculos aluno ↔ responsável', () => {
  let aluno;
  let mae;
  let pai;

  async function criarResponsavel(email, nome) {
    const res = await api('post', '/api/usuarios').send({
      nome,
      email,
      senha: 'Senha123',
      tipoUsuario: 'RESPONSAVEL',
      telefone: '11999990000',
    });
    return res.body.data.user;
  }

  before(async () => {
    aluno = await criarAluno({ nome: 'Lucas Vínculo' });
    mae = await criarResponsavel('mae.vinculo@escolaavis.com', 'Mãe Vínculo');
    pai = await criarResponsavel('pai.vinculo@escolaavis.com', 'Pai Vínculo');
  });

  it('vincula responsável (201) com dados do usuário', async () => {
    const res = await api('post', `/api/alunos/${aluno.id}/responsaveis`).send({
      usuarioId: mae.id,
      parentesco: 'Mãe',
      responsavelPrincipal: true,
    });
    assert.equal(res.status, 201);
    const { vinculo } = res.body.data;
    assert.equal(vinculo.parentesco, 'Mãe');
    assert.equal(vinculo.responsavelPrincipal, true);
    assert.equal(vinculo.autorizadoReceberComunicacoes, true); // padrão
    assert.deepEqual(vinculo.responsavel, {
      usuarioId: mae.id,
      nome: 'Mãe Vínculo',
      email: 'mae.vinculo@escolaavis.com',
      telefone: '11999990000',
      ativo: true,
    });
  });

  it('recusa vincular o mesmo responsável duas vezes (409)', async () => {
    const res = await api('post', `/api/alunos/${aluno.id}/responsaveis`).send({ usuarioId: mae.id, parentesco: 'Mãe' });
    assert.equal(res.status, 409);
    assert.equal(res.body.errors[0].field, 'usuarioId');
  });

  it('novo principal desmarca o anterior (na mesma transação)', async () => {
    const res = await api('post', `/api/alunos/${aluno.id}/responsaveis`).send({
      usuarioId: pai.id,
      parentesco: 'Pai',
      responsavelPrincipal: true,
    });
    assert.equal(res.status, 201);

    const lista = await api('get', `/api/alunos/${aluno.id}/responsaveis`);
    const principais = lista.body.data.responsaveis.filter((v) => v.responsavelPrincipal);
    assert.equal(principais.length, 1);
    assert.equal(principais[0].responsavel.nome, 'Pai Vínculo');
    // Principal aparece primeiro.
    assert.equal(lista.body.data.responsaveis[0].responsavel.nome, 'Pai Vínculo');

    const detalhe = await api('get', `/api/alunos/${aluno.id}`);
    assert.equal(detalhe.body.data.aluno.totalResponsaveis, 2);
    assert.equal(detalhe.body.data.aluno.responsaveis.length, 2);
  });

  it('atualiza o vínculo (principal volta para a mãe)', async () => {
    const lista = await api('get', `/api/alunos/${aluno.id}/responsaveis`);
    const vinculoMae = lista.body.data.responsaveis.find((v) => v.responsavel.usuarioId === mae.id);

    const res = await api('put', `/api/alunos/${aluno.id}/responsaveis/${vinculoMae.id}`).send({
      parentesco: 'Mãe',
      responsavelPrincipal: true,
      autorizadoReceberComunicacoes: false,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.vinculo.autorizadoReceberComunicacoes, false);

    const depois = await api('get', `/api/alunos/${aluno.id}/responsaveis`);
    const principais = depois.body.data.responsaveis.filter((v) => v.responsavelPrincipal);
    assert.deepEqual(principais.map((v) => v.responsavel.usuarioId), [mae.id]);
  });

  it('só aceita usuário RESPONSAVEL, ativo e existente (400)', async () => {
    const professor = await createUser({ email: 'prof.vinculo@escolaavis.com', tipoUsuario: 'PROFESSOR' });
    const inativo = await createUser({ email: 'resp.inativo@escolaavis.com', tipoUsuario: 'RESPONSAVEL', ativo: false });
    const casos = [
      [professor.id, 'O usuário selecionado não é um responsável.'],
      [inativo.id, 'Este responsável está desativado. Reative-o antes de vincular.'],
      ['00000000-0000-4000-8000-000000000000', 'Responsável não encontrado.'],
      ['nao-e-uuid', 'Selecione um responsável válido.'],
    ];
    for (const [usuarioId, message] of casos) {
      const res = await api('post', `/api/alunos/${aluno.id}/responsaveis`).send({ usuarioId, parentesco: 'Tio' });
      assert.equal(res.status, 400, message);
      assert.deepEqual(res.body.errors[0], { field: 'usuarioId', message });
    }
  });

  it('cria o registro em responsaveis se o usuário ainda não tiver', async () => {
    const semRegistro = await createUser({ email: 'resp.semregistro@escolaavis.com', tipoUsuario: 'RESPONSAVEL' });
    const res = await api('post', `/api/alunos/${aluno.id}/responsaveis`).send({
      usuarioId: semRegistro.id,
      parentesco: 'Avó',
    });
    assert.equal(res.status, 201);
    const { rowCount } = await pool.query('SELECT 1 FROM responsaveis WHERE usuario_id = $1', [semRegistro.id]);
    assert.equal(rowCount, 1);
  });

  it('remove vínculo e não aceita vínculo de outro aluno (404)', async () => {
    const outroAluno = await criarAluno();
    const lista = await api('get', `/api/alunos/${aluno.id}/responsaveis`);
    const vinculoPai = lista.body.data.responsaveis.find((v) => v.responsavel.usuarioId === pai.id);

    // O vínculo existe, mas pertence a outro aluno.
    const cruzado = await api('delete', `/api/alunos/${outroAluno.id}/responsaveis/${vinculoPai.id}`);
    assert.equal(cruzado.status, 404);

    const remover = await api('delete', `/api/alunos/${aluno.id}/responsaveis/${vinculoPai.id}`);
    assert.equal(remover.status, 200);
    const depois = await api('get', `/api/alunos/${aluno.id}/responsaveis`);
    assert.ok(!depois.body.data.responsaveis.some((v) => v.id === vinculoPai.id));

    assert.equal((await api('delete', `/api/alunos/${aluno.id}/responsaveis/${vinculoPai.id}`)).status, 404);
  });
});
