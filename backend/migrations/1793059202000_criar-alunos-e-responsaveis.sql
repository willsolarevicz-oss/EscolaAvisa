-- Up Migration

-- Alunos não fazem login nesta fase; por isso não há vínculo com usuarios.
CREATE TABLE alunos (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             VARCHAR(150) NOT NULL,
  data_nascimento  DATE         NOT NULL,
  matricula        VARCHAR(30)  NOT NULL,
  ativo            BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT alunos_matricula_unique UNIQUE (matricula),
  CONSTRAINT alunos_nome_not_blank_check CHECK (BTRIM(nome) <> ''),
  CONSTRAINT alunos_matricula_not_blank_check CHECK (BTRIM(matricula) <> ''),
  CONSTRAINT alunos_data_nascimento_check CHECK (data_nascimento >= DATE '1900-01-01')
);

CREATE INDEX alunos_nome_idx ON alunos (nome);

CREATE TRIGGER alunos_set_atualizado_em
  BEFORE UPDATE ON alunos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Dados extras de um usuário do tipo RESPONSAVEL (relação 1:1 com usuarios).
-- A regra "usuario_id precisa ser do tipo RESPONSAVEL" é validada na camada de serviço.
CREATE TABLE responsaveis (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     UUID         NOT NULL,
  -- Apenas dígitos (DDD + número, opcionalmente com 55 na frente).
  telefone       VARCHAR(20),
  -- Apenas dígitos (11). Opcional; quando informado, único.
  cpf            CHAR(11),
  criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- RESTRICT: não se apaga um usuário que é responsável; desative-o (ativo = false).
  CONSTRAINT responsaveis_usuario_fk
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT responsaveis_usuario_unique UNIQUE (usuario_id),
  -- UNIQUE aceita vários NULL, então o CPF continua opcional.
  CONSTRAINT responsaveis_cpf_unique UNIQUE (cpf),
  CONSTRAINT responsaveis_cpf_formato_check CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
  CONSTRAINT responsaveis_telefone_formato_check
    CHECK (telefone IS NULL OR telefone ~ '^[0-9]{10,13}$')
);

CREATE TRIGGER responsaveis_set_atualizado_em
  BEFORE UPDATE ON responsaveis
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- N:N entre alunos e responsáveis (um aluno pode ter vários responsáveis e vice-versa).
CREATE TABLE aluno_responsavel (
  id                               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id                         UUID        NOT NULL,
  responsavel_id                   UUID        NOT NULL,
  parentesco                       VARCHAR(50) NOT NULL,
  responsavel_principal            BOOLEAN     NOT NULL DEFAULT FALSE,
  autorizado_receber_comunicacoes  BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT aluno_responsavel_aluno_fk
    FOREIGN KEY (aluno_id) REFERENCES alunos (id) ON DELETE CASCADE,
  CONSTRAINT aluno_responsavel_responsavel_fk
    FOREIGN KEY (responsavel_id) REFERENCES responsaveis (id) ON DELETE CASCADE,
  CONSTRAINT aluno_responsavel_unique UNIQUE (aluno_id, responsavel_id),
  CONSTRAINT aluno_responsavel_parentesco_not_blank_check CHECK (BTRIM(parentesco) <> '')
);

-- No máximo UM responsável principal por aluno.
CREATE UNIQUE INDEX aluno_responsavel_principal_unique
  ON aluno_responsavel (aluno_id) WHERE responsavel_principal;
-- O índice da UNIQUE (aluno_id, responsavel_id) já cobre buscas por aluno;
-- este cobre "quais alunos são deste responsável".
CREATE INDEX aluno_responsavel_responsavel_idx ON aluno_responsavel (responsavel_id);

CREATE TRIGGER aluno_responsavel_set_atualizado_em
  BEFORE UPDATE ON aluno_responsavel
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Down Migration

DROP TABLE IF EXISTS aluno_responsavel;
DROP TABLE IF EXISTS responsaveis;
DROP TABLE IF EXISTS alunos;
