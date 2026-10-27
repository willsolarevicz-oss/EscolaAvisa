-- Up Migration

CREATE TABLE turmas (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           VARCHAR(100) NOT NULL,
  ano_letivo     SMALLINT     NOT NULL,
  turno          VARCHAR(20)  NOT NULL,
  descricao      TEXT,
  ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT turmas_nome_not_blank_check CHECK (BTRIM(nome) <> ''),
  CONSTRAINT turmas_ano_letivo_check CHECK (ano_letivo BETWEEN 2000 AND 2100),
  CONSTRAINT turmas_turno_check CHECK (turno IN ('MATUTINO', 'VESPERTINO', 'NOTURNO', 'INTEGRAL')),
  -- Necessária para a FK composta de aluno_turma (garante ano_letivo coerente).
  CONSTRAINT turmas_id_ano_letivo_unique UNIQUE (id, ano_letivo)
);

-- Não pode haver duas turmas com o mesmo nome (ignorando maiúsculas) no mesmo ano e turno.
CREATE UNIQUE INDEX turmas_nome_ano_turno_unique ON turmas (ano_letivo, LOWER(nome), turno);

CREATE TRIGGER turmas_set_atualizado_em
  BEFORE UPDATE ON turmas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE disciplinas (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           VARCHAR(100) NOT NULL,
  descricao      TEXT,
  ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT disciplinas_nome_not_blank_check CHECK (BTRIM(nome) <> '')
);

CREATE UNIQUE INDEX disciplinas_nome_unique ON disciplinas (LOWER(nome));

CREATE TRIGGER disciplinas_set_atualizado_em
  BEFORE UPDATE ON disciplinas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Matrícula do aluno em uma turma (N:N, guardando o histórico por ano letivo).
CREATE TABLE aluno_turma (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id       UUID        NOT NULL,
  turma_id       UUID        NOT NULL,
  ano_letivo     SMALLINT    NOT NULL,
  ativo          BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT aluno_turma_aluno_fk
    FOREIGN KEY (aluno_id) REFERENCES alunos (id) ON DELETE CASCADE,
  -- FK composta: o ano_letivo da matrícula precisa ser o mesmo da turma.
  CONSTRAINT aluno_turma_turma_fk
    FOREIGN KEY (turma_id, ano_letivo) REFERENCES turmas (id, ano_letivo)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT aluno_turma_unique UNIQUE (aluno_id, turma_id)
);

-- Um aluno só pode estar ativo em UMA turma por ano letivo.
CREATE UNIQUE INDEX aluno_turma_ativa_por_ano_unique
  ON aluno_turma (aluno_id, ano_letivo) WHERE ativo;
CREATE INDEX aluno_turma_turma_idx ON aluno_turma (turma_id);

CREATE TRIGGER aluno_turma_set_atualizado_em
  BEFORE UPDATE ON aluno_turma
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Qual professor leciona qual disciplina em qual turma.
CREATE TABLE professor_turma (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id   UUID        NOT NULL,
  turma_id       UUID        NOT NULL,
  disciplina_id  UUID        NOT NULL,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- professor_id aponta para usuarios (tipo PROFESSOR, validado na camada de serviço).
  CONSTRAINT professor_turma_professor_fk
    FOREIGN KEY (professor_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT professor_turma_turma_fk
    FOREIGN KEY (turma_id) REFERENCES turmas (id) ON DELETE CASCADE,
  CONSTRAINT professor_turma_disciplina_fk
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas (id) ON DELETE RESTRICT,
  CONSTRAINT professor_turma_unique UNIQUE (professor_id, turma_id, disciplina_id)
);

CREATE INDEX professor_turma_turma_idx ON professor_turma (turma_id);
CREATE INDEX professor_turma_disciplina_idx ON professor_turma (disciplina_id);

CREATE TRIGGER professor_turma_set_atualizado_em
  BEFORE UPDATE ON professor_turma
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Down Migration

DROP TABLE IF EXISTS professor_turma;
DROP TABLE IF EXISTS aluno_turma;
DROP TABLE IF EXISTS disciplinas;
DROP TABLE IF EXISTS turmas;
