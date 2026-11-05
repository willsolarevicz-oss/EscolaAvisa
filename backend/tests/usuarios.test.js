import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { isValidCpf } from '../src/utils/cpf.js';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

const app = createApp();
const ADMIN = { email: 'admin@escolaavis.com', senha: 'Admin@123' };
// CPFs válidos (dígitos verificadores corretos), usados só em teste.
const CPF_VALIDO_1 = '52998224725';
const CPF_VALIDO_2 = '11144477735';

let adminToken;
let adminId;

async function tokenFor(credentials) {
  const res = await request(app).post('/api/auth/login').send(credentials);
  assert.equal(res.status, 200, `login falhou para ${credentials.email}: ${JSON.stringify(res.body)}`);
  return res.body.data.token;
}

function api(method, url, token = adminToken) {
  return request(app)[method](url).set('Authorization', `Bearer ${token}`);
}

function novoUsuario(overrides = {}) {
  return {
    nome: 'Maria Professora',
    email: `prof.${Math.random().toString(36).slice(2, 10)}@escolaavis.com`,
    senha: 'Senha123',
    tipoUsuario: 'PROFESSOR',
    ...overrides,
  };
}

before(async () => {
  await resetDatabase();
  adminToken = await tokenFor(ADMIN);
  adminId = (await api('get', '/api/auth/me')).body.data.user.id;
});

after(async () => {
  await pool.end();
});

describe('Validação de CPF', () => {
  it('aceita CPFs válidos e recusa inválidos', () => {
    assert.equal(isValidCpf(CPF_VALIDO_1), true);
    assert.equal(isValidCpf(CPF_VALIDO_2), true);
    assert.equal(isValidCpf('52998224726'), false); // dígito verificador errado
    assert.equal(isValidCpf('11111111111'), false); // sequência repetida
    assert.equal(isValidCpf('123'), false);
  });
});

describe('Acesso a /api/usuarios', () => {
  it('exige autenticação (401)', async () => {
    const res = await request(app).get('/api/usuarios');
    assert.equal(res.status, 401);
  });

  it('é exclusivo de ADMIN (403 para professor e responsável)', async () => {
    await createUser({ email: 'prof.acesso@escolaavis.com', senha: 'Prof@1234', tipoUsuario: 'PROFESSOR' });
    await createUser({ email: 'resp.acesso@escolaavis.com', senha: 'Resp@1234', tipoUsuario: 'RESPONSAVEL' });
    const profToken = await tokenFor({ email: 'prof.acesso@escolaavis.com', senha: 'Prof@1234' });
    const respToken = await tokenFor({ email: 'resp.acesso@escolaavis.com', senha: 'Resp@1234' });

    assert.equal((await api('get', '/api/usuarios', profToken)).status, 403);
    assert.equal((await api('get', '/api/usuarios', respToken)).status, 403);
    assert.equal((await api('post', '/api/usuarios', profToken).send(novoUsuario())).status, 403);
  });
});

describe('POST /api/usuarios', () => {
  it('cria professor (201) sem expor a senha', async () => {
    const dados = novoUsuario({ email: '  Novo.Prof@EscolaAvis.com ' });
    const res = await api('post', '/api/usuarios').send(dados);

    assert.equal(res.status, 201);
    const { user } = res.body.data;
    assert.equal(user.email, 'novo.prof@escolaavis.com');
    assert.equal(user.tipoUsuario, 'PROFESSOR');
    assert.equal(user.ativo, true);
    assert.equal(user.responsavel, undefined);
    assert.ok(!JSON.stringify(res.body).includes('$2b$'));
    assert.equal(user.senha, undefined);

    // A senha foi salva com hash e funciona no login.
    await tokenFor({ email: 'novo.prof@escolaavis.com', senha: dados.senha });
  });

  it('cria responsável com telefone e CPF (aceita máscara) na tabela responsaveis', async () => {
    const res = await api('post', '/api/usuarios').send(
      novoUsuario({
        nome: 'João Responsável',
        tipoUsuario: 'RESPONSAVEL',
        telefone: '(11) 99999-8888',
        cpf: '529.982.247-25',
      }),
    );

    assert.equal(res.status, 201);
    assert.deepEqual(res.body.data.user.responsavel, { telefone: '11999998888', cpf: CPF_VALIDO_1 });

    const { rows } = await pool.query('SELECT telefone, cpf FROM responsaveis WHERE usuario_id = $1', [
      res.body.data.user.id,
    ]);
    assert.deepEqual(rows[0], { telefone: '11999998888', cpf: CPF_VALIDO_1 });
  });

  it('recusa e-mail duplicado (409)', async () => {
    const res = await api('post', '/api/usuarios').send(novoUsuario({ email: 'ADMIN@escolaavis.com' }));
    assert.equal(res.status, 409);
    assert.equal(res.body.message, 'Já existe um usuário com este e-mail.');
    assert.equal(res.body.errors[0].field, 'email');
  });

  it('CPF duplicado gera 409 e desfaz a criação do usuário (transação)', async () => {
    const email = 'resp.cpf.duplicado@escolaavis.com';
    const res = await api('post', '/api/usuarios').send(
      novoUsuario({ email, tipoUsuario: 'RESPONSAVEL', cpf: CPF_VALIDO_1 }),
    );
    assert.equal(res.status, 409);
    assert.equal(res.body.message, 'Já existe um responsável com este CPF.');

    const { rowCount } = await pool.query('SELECT 1 FROM usuarios WHERE email = $1', [email]);
    assert.equal(rowCount, 0, 'o usuário não pode ficar salvo sem o registro de responsável');
  });

  it('aplica a política de senha', async () => {
    const casos = [
      ['curta1', 'A senha deve ter pelo menos 8 caracteres.'],
      ['somenteletras', 'A senha deve conter pelo menos um número.'],
      ['12345678', 'A senha deve conter pelo menos uma letra.'],
    ];
    for (const [senha, mensagem] of casos) {
      const res = await api('post', '/api/usuarios').send(novoUsuario({ senha }));
      assert.equal(res.status, 400, senha);
      assert.ok(
        res.body.errors.some((e) => e.field === 'senha' && e.message === mensagem),
        `${senha}: ${JSON.stringify(res.body.errors)}`,
      );
    }
  });

  it('valida perfil, CPF e campos exclusivos de responsável', async () => {
    const perfil = await api('post', '/api/usuarios').send(novoUsuario({ tipoUsuario: 'ALUNO' }));
    assert.equal(perfil.status, 400);
    assert.equal(perfil.body.errors[0].field, 'tipoUsuario');

    const cpf = await api('post', '/api/usuarios').send(
      novoUsuario({ tipoUsuario: 'RESPONSAVEL', cpf: '529.982.247-26' }),
    );
    assert.equal(cpf.status, 400);
    assert.equal(cpf.body.errors[0].message, 'CPF inválido.');

    const telefoneProfessor = await api('post', '/api/usuarios').send(
      novoUsuario({ telefone: '11999998888' }),
    );
    assert.equal(telefoneProfessor.status, 400);
    assert.equal(telefoneProfessor.body.errors[0].field, 'telefone');
  });
});

describe('GET /api/usuarios', () => {
  before(async () => {
    for (const [nome, tipoUsuario, ativo] of [
      ['Ana Lista', 'PROFESSOR', true],
      ['Bruno Lista', 'PROFESSOR', false],
      ['Carla Lista', 'RESPONSAVEL', true],
      ['Daniel_Lista', 'PROFESSOR', true],
    ]) {
      await createUser({ nome, email: `${nome.toLowerCase().replace(/\W/g, '.')}@lista.com`, tipoUsuario, ativo });
    }
  });

  it('pagina e informa o total', async () => {
    const res = await api('get', '/api/usuarios?pageSize=2&page=1');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.items.length, 2);
    assert.equal(res.body.data.pagination.page, 1);
    assert.equal(res.body.data.pagination.pageSize, 2);
    assert.ok(res.body.data.pagination.total >= 4);
    assert.equal(res.body.data.pagination.totalPages, Math.ceil(res.body.data.pagination.total / 2));
  });

  it('página além do fim retorna lista vazia com o total correto', async () => {
    const res = await api('get', '/api/usuarios?page=999');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.items, []);
    assert.ok(res.body.data.pagination.total > 0);
  });

  it('busca por nome/e-mail sem diferenciar maiúsculas, em ordem alfabética', async () => {
    const res = await api('get', '/api/usuarios?busca=LISTA');
    const nomes = res.body.data.items.map((u) => u.nome);
    assert.deepEqual(nomes, ['Ana Lista', 'Bruno Lista', 'Carla Lista', 'Daniel_Lista']);
  });

  it('trata % e _ da busca como texto literal', async () => {
    const res = await api('get', '/api/usuarios?busca=l_lista');
    assert.deepEqual(res.body.data.items.map((u) => u.nome), ['Daniel_Lista']);
  });

  it('filtra por perfil e situação', async () => {
    const res = await api('get', '/api/usuarios?busca=lista&tipo=PROFESSOR&ativo=false');
    assert.deepEqual(res.body.data.items.map((u) => u.nome), ['Bruno Lista']);
  });

  it('valida os parâmetros da query', async () => {
    for (const query of ['page=0', 'pageSize=500', 'tipo=ALUNO', 'ativo=talvez', 'page=abc']) {
      const res = await api('get', `/api/usuarios?${query}`);
      assert.equal(res.status, 400, query);
    }
  });
});

describe('GET/PUT /api/usuarios/:id', () => {
  let responsavelId;

  before(async () => {
    const res = await api('post', '/api/usuarios').send(
      novoUsuario({ nome: 'Rita Mãe', email: 'rita@escolaavis.com', tipoUsuario: 'RESPONSAVEL', cpf: CPF_VALIDO_2 }),
    );
    responsavelId = res.body.data.user.id;
  });

  it('detalha o usuário com dados de responsável', async () => {
    const res = await api('get', `/api/usuarios/${responsavelId}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.nome, 'Rita Mãe');
    assert.deepEqual(res.body.data.user.responsavel, { telefone: null, cpf: CPF_VALIDO_2 });
  });

  it('responde 404 para id inexistente ou malformado', async () => {
    assert.equal((await api('get', '/api/usuarios/00000000-0000-4000-8000-000000000000')).status, 404);
    assert.equal((await api('get', '/api/usuarios/nao-e-uuid')).status, 404);
    assert.equal((await api('put', '/api/usuarios/nao-e-uuid').send({ nome: 'X Y', email: 'x@y.com' })).status, 404);
  });

  it('atualiza nome, e-mail, telefone e limpa o CPF', async () => {
    const res = await api('put', `/api/usuarios/${responsavelId}`).send({
      nome: 'Rita Mãe Atualizada',
      email: 'Rita.Nova@EscolaAvis.com',
      telefone: '21988887777',
      cpf: '',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user.nome, 'Rita Mãe Atualizada');
    assert.equal(res.body.data.user.email, 'rita.nova@escolaavis.com');
    assert.deepEqual(res.body.data.user.responsavel, { telefone: '21988887777', cpf: null });
  });

  it('não permite trocar o perfil', async () => {
    const res = await api('put', `/api/usuarios/${responsavelId}`).send({
      nome: 'Rita',
      email: 'rita.nova@escolaavis.com',
      tipoUsuario: 'ADMIN',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].field, 'tipoUsuario');
  });

  it('recusa e-mail de outro usuário (409)', async () => {
    const res = await api('put', `/api/usuarios/${responsavelId}`).send({
      nome: 'Rita',
      email: 'admin@escolaavis.com',
    });
    assert.equal(res.status, 409);
  });

  it('recusa telefone/CPF para quem não é responsável', async () => {
    const res = await api('put', `/api/usuarios/${adminId}`).send({
      nome: 'Administrador EscolaAvis',
      email: 'admin@escolaavis.com',
      cpf: CPF_VALIDO_1,
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.errors[0].field, 'cpf');
  });
});

describe('PATCH /api/usuarios/:id/ativo e /senha', () => {
  let professor;
  const senhaOriginal = 'Original1';

  before(async () => {
    const res = await api('post', '/api/usuarios').send(
      novoUsuario({ email: 'prof.status@escolaavis.com', senha: senhaOriginal }),
    );
    professor = res.body.data.user;
  });

  it('desativar bloqueia o login e derruba a sessão; reativar devolve o acesso', async () => {
    const sessao = await tokenFor({ email: professor.email, senha: senhaOriginal });

    const desativar = await api('patch', `/api/usuarios/${professor.id}/ativo`).send({ ativo: false });
    assert.equal(desativar.status, 200);
    assert.equal(desativar.body.data.user.ativo, false);

    const login = await request(app).post('/api/auth/login').send({ email: professor.email, senha: senhaOriginal });
    assert.equal(login.status, 403);
    assert.equal((await api('get', '/api/auth/me', sessao)).status, 401);

    const ativar = await api('patch', `/api/usuarios/${professor.id}/ativo`).send({ ativo: true });
    assert.equal(ativar.body.data.user.ativo, true);
    await tokenFor({ email: professor.email, senha: senhaOriginal });
  });

  it('admin não pode desativar a si mesmo', async () => {
    const res = await api('patch', `/api/usuarios/${adminId}/ativo`).send({ ativo: false });
    assert.equal(res.status, 400);
    assert.equal(res.body.message, 'Você não pode desativar o seu próprio usuário.');
  });

  it('exige booleano em "ativo"', async () => {
    const res = await api('patch', `/api/usuarios/${professor.id}/ativo`).send({ ativo: 'false' });
    assert.equal(res.status, 400);
  });

  it('redefine a senha: a nova funciona e a antiga não', async () => {
    const fraca = await api('patch', `/api/usuarios/${professor.id}/senha`).send({ senha: 'fraca' });
    assert.equal(fraca.status, 400);

    const res = await api('patch', `/api/usuarios/${professor.id}/senha`).send({ senha: 'NovaSenha9' });
    assert.equal(res.status, 200);

    await tokenFor({ email: professor.email, senha: 'NovaSenha9' });
    const antiga = await request(app).post('/api/auth/login').send({ email: professor.email, senha: senhaOriginal });
    assert.equal(antiga.status, 401);
  });
});
