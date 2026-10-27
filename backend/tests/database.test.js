import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createUser, pool, resetDatabase } from './helpers/testDb.js';

// Valida as regras de integridade criadas nas migrations (o banco é a última barreira).

async function expectPgError(sql, params, expectedCode, constraint) {
  await assert.rejects(pool.query(sql, params), (error) => {
    assert.equal(error.code, expectedCode, `esperado ${expectedCode}, recebido ${error.code}: ${error.message}`);
    if (constraint) assert.equal(error.constraint, constraint);
    return true;
  });
}

async function insertAluno(matricula, nome = 'Aluno Teste') {
  const { rows } = await pool.query(
    `INSERT INTO alunos (nome, data_nascimento, matricula) VALUES ($1, '2015-03-10', $2) RETURNING id`,
    [nome, matricula],
  );
  return rows[0].id;
}

async function insertTurma(nome, anoLetivo = 2026, turno = 'MATUTINO') {
  const { rows } = await pool.query(
    'INSERT INTO turmas (nome, ano_letivo, turno) VALUES ($1, $2, $3) RETURNING id',
    [nome, anoLetivo, turno],
  );
  return rows[0].id;
}

async function insertResponsavel(email, cpf = null) {
  const usuario = await createUser({ email, tipoUsuario: 'RESPONSAVEL' });
  const { rows } = await pool.query(
    'INSERT INTO responsaveis (usuario_id, telefone, cpf) VALUES ($1, $2, $3) RETURNING id',
    [usuario.id, '11999998888', cpf],
  );
  return { responsavelId: rows[0].id, usuarioId: usuario.id };
}

before(async () => {
  await resetDatabase();
});

after(async () => {
  await pool.end();
});

describe('Migrations', () => {
  it('criaram todas as tabelas do modelo inicial', async () => {
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
    );
    assert.deepEqual(
      rows.map((r) => r.table_name),
      [
        'aluno_responsavel',
        'aluno_turma',
        'alunos',
        'disciplinas',
        'pgmigrations',
        'professor_turma',
        'responsaveis',
        'turmas',
        'usuarios',
      ],
    );
  });

  it('seed criou o admin com senha em hash bcrypt', async () => {
    const { rows } = await pool.query(
      "SELECT tipo_usuario, ativo, senha_hash FROM usuarios WHERE email = 'admin@escolaavis.com'",
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].tipo_usuario, 'ADMIN');
    assert.equal(rows[0].ativo, true);
    assert.match(rows[0].senha_hash, /^\$2[aby]\$12\$/);
    assert.notEqual(rows[0].senha_hash, 'Admin@123');
  });
});

describe('Constraints de usuarios', () => {
  it('e-mail é único', async () => {
    await expectPgError(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) VALUES ('X', 'admin@escolaavis.com', 'h', 'ADMIN')`,
      [],
      '23505',
      'usuarios_email_unique',
    );
  });

  it('e-mail precisa estar normalizado (minúsculas)', async () => {
    await expectPgError(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) VALUES ('X', 'Admin@EscolaAvis.com', 'h', 'ADMIN')`,
      [],
      '23514',
      'usuarios_email_normalizado_check',
    );
  });

  it('tipo_usuario só aceita ADMIN, PROFESSOR ou RESPONSAVEL', async () => {
    await expectPgError(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario) VALUES ('X', 'x@x.com', 'h', 'ALUNO')`,
      [],
      '23514',
      'usuarios_tipo_usuario_check',
    );
  });

  it('trigger atualiza atualizado_em automaticamente', async () => {
    const user = await createUser({ email: 'trigger@escolaavis.com' });
    const { rows: before } = await pool.query('SELECT atualizado_em FROM usuarios WHERE id = $1', [user.id]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const { rows: afterUpdate } = await pool.query(
      "UPDATE usuarios SET nome = 'Novo Nome' WHERE id = $1 RETURNING atualizado_em",
      [user.id],
    );
    assert.ok(afterUpdate[0].atualizado_em > before[0].atualizado_em);
  });
});

describe('Constraints de alunos e responsáveis', () => {
  it('matrícula é única', async () => {
    await insertAluno('MAT-001');
    await expectPgError(
      `INSERT INTO alunos (nome, data_nascimento, matricula) VALUES ('Outro', '2014-01-01', 'MAT-001')`,
      [],
      '23505',
      'alunos_matricula_unique',
    );
  });

  it('CPF do responsável é opcional, mas único e só com 11 dígitos', async () => {
    await insertResponsavel('resp.semcpf1@escolaavis.com');
    await insertResponsavel('resp.semcpf2@escolaavis.com'); // dois sem CPF: permitido
    await insertResponsavel('resp.cpf@escolaavis.com', '12345678901');

    const user = await createUser({ email: 'resp.cpfdup@escolaavis.com', tipoUsuario: 'RESPONSAVEL' });
    await expectPgError(
      "INSERT INTO responsaveis (usuario_id, cpf) VALUES ($1, '12345678901')",
      [user.id],
      '23505',
      'responsaveis_cpf_unique',
    );
    await expectPgError(
      "INSERT INTO responsaveis (usuario_id, cpf) VALUES ($1, '123456789ab')",
      [user.id],
      '23514',
      'responsaveis_cpf_formato_check',
    );
  });

  it('um usuário só pode ter um cadastro de responsável', async () => {
    const { usuarioId } = await insertResponsavel('resp.unico@escolaavis.com');
    await expectPgError(
      'INSERT INTO responsaveis (usuario_id) VALUES ($1)',
      [usuarioId],
      '23505',
      'responsaveis_usuario_unique',
    );
  });

  it('não permite apagar usuário vinculado a responsável (RESTRICT)', async () => {
    const { usuarioId } = await insertResponsavel('resp.restrict@escolaavis.com');
    await expectPgError('DELETE FROM usuarios WHERE id = $1', [usuarioId], '23503');
  });

  it('aluno_responsavel: vínculo único e no máximo um responsável principal', async () => {
    const alunoId = await insertAluno('MAT-002');
    const { responsavelId: r1 } = await insertResponsavel('mae@escolaavis.com');
    const { responsavelId: r2 } = await insertResponsavel('pai@escolaavis.com');

    await pool.query(
      `INSERT INTO aluno_responsavel (aluno_id, responsavel_id, parentesco, responsavel_principal)
       VALUES ($1, $2, 'Mãe', TRUE)`,
      [alunoId, r1],
    );
    await expectPgError(
      `INSERT INTO aluno_responsavel (aluno_id, responsavel_id, parentesco) VALUES ($1, $2, 'Mãe')`,
      [alunoId, r1],
      '23505',
      'aluno_responsavel_unique',
    );
    await expectPgError(
      `INSERT INTO aluno_responsavel (aluno_id, responsavel_id, parentesco, responsavel_principal)
       VALUES ($1, $2, 'Pai', TRUE)`,
      [alunoId, r2],
      '23505',
      'aluno_responsavel_principal_unique',
    );
    // Como não-principal, o segundo responsável é aceito.
    await pool.query(
      `INSERT INTO aluno_responsavel (aluno_id, responsavel_id, parentesco) VALUES ($1, $2, 'Pai')`,
      [alunoId, r2],
    );
  });

  it('FK impede vínculo com aluno inexistente', async () => {
    const { responsavelId } = await insertResponsavel('resp.fk@escolaavis.com');
    await expectPgError(
      `INSERT INTO aluno_responsavel (aluno_id, responsavel_id, parentesco)
       VALUES ('00000000-0000-4000-8000-000000000000', $1, 'Tio')`,
      [responsavelId],
      '23503',
      'aluno_responsavel_aluno_fk',
    );
  });
});

describe('Constraints de turmas, disciplinas e matrículas', () => {
  it('turma: turno válido e nome único por ano/turno (sem diferenciar maiúsculas)', async () => {
    await insertTurma('6º Ano A');
    await expectPgError(
      "INSERT INTO turmas (nome, ano_letivo, turno) VALUES ('6º ANO A', 2026, 'MATUTINO')",
      [],
      '23505',
      'turmas_nome_ano_turno_unique',
    );
    await insertTurma('6º Ano A', 2026, 'VESPERTINO'); // outro turno: permitido
    await expectPgError(
      "INSERT INTO turmas (nome, ano_letivo, turno) VALUES ('7º Ano', 2026, 'MADRUGADA')",
      [],
      '23514',
      'turmas_turno_check',
    );
  });

  it('aluno_turma: ano letivo precisa ser o mesmo da turma', async () => {
    const alunoId = await insertAluno('MAT-003');
    const turmaId = await insertTurma('8º Ano B');
    await expectPgError(
      'INSERT INTO aluno_turma (aluno_id, turma_id, ano_letivo) VALUES ($1, $2, 2025)',
      [alunoId, turmaId],
      '23503',
      'aluno_turma_turma_fk',
    );
  });

  it('aluno_turma: aluno ativo em apenas uma turma por ano letivo', async () => {
    const alunoId = await insertAluno('MAT-004');
    const turmaA = await insertTurma('9º Ano A');
    const turmaB = await insertTurma('9º Ano B');
    await pool.query('INSERT INTO aluno_turma (aluno_id, turma_id, ano_letivo) VALUES ($1, $2, 2026)', [
      alunoId,
      turmaA,
    ]);
    await expectPgError(
      'INSERT INTO aluno_turma (aluno_id, turma_id, ano_letivo) VALUES ($1, $2, 2026)',
      [alunoId, turmaB],
      '23505',
      'aluno_turma_ativa_por_ano_unique',
    );
    // Transferência: desativa a matrícula antiga e então a nova é aceita (histórico preservado).
    await pool.query('UPDATE aluno_turma SET ativo = FALSE WHERE aluno_id = $1', [alunoId]);
    await pool.query('INSERT INTO aluno_turma (aluno_id, turma_id, ano_letivo) VALUES ($1, $2, 2026)', [
      alunoId,
      turmaB,
    ]);
  });

  it('professor_turma: atribuição única e disciplina com nome único', async () => {
    const professor = await createUser({ email: 'prof.mat@escolaavis.com', tipoUsuario: 'PROFESSOR' });
    const turmaId = await insertTurma('1º Ano EM');
    const { rows } = await pool.query("INSERT INTO disciplinas (nome) VALUES ('Matemática') RETURNING id");
    const disciplinaId = rows[0].id;

    await expectPgError("INSERT INTO disciplinas (nome) VALUES ('MATEMÁTICA')", [], '23505', 'disciplinas_nome_unique');

    await pool.query(
      'INSERT INTO professor_turma (professor_id, turma_id, disciplina_id) VALUES ($1, $2, $3)',
      [professor.id, turmaId, disciplinaId],
    );
    await expectPgError(
      'INSERT INTO professor_turma (professor_id, turma_id, disciplina_id) VALUES ($1, $2, $3)',
      [professor.id, turmaId, disciplinaId],
      '23505',
      'professor_turma_unique',
    );
    // Disciplina em uso não pode ser apagada (RESTRICT).
    await expectPgError('DELETE FROM disciplinas WHERE id = $1', [disciplinaId], '23503');
  });
});
