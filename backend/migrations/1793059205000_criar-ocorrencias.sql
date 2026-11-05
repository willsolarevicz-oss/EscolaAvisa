-- Up Migration

-- Registro de ocorrências sobre um aluno. Como os avisos, não é editado depois de
-- registrado (o responsável pode já ter dado ciência); corrige-se arquivando.
CREATE TABLE ocorrencias (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id         UUID         NOT NULL,
  autor_id         UUID         NOT NULL,
  tipo             VARCHAR(20)  NOT NULL,
  descricao        TEXT         NOT NULL,
  data_ocorrencia  DATE         NOT NULL,
  ativo            BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT ocorrencias_aluno_fk FOREIGN KEY (aluno_id) REFERENCES alunos (id) ON DELETE RESTRICT,
  CONSTRAINT ocorrencias_autor_fk FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT ocorrencias_tipo_check
    CHECK (tipo IN ('DISCIPLINAR', 'ATRASO', 'SAUDE', 'ELOGIO', 'OUTRO')),
  CONSTRAINT ocorrencias_descricao_check CHECK (BTRIM(descricao) <> '' AND LENGTH(descricao) <= 5000),
  CONSTRAINT ocorrencias_data_check CHECK (data_ocorrencia >= DATE '2000-01-01')
);

CREATE INDEX ocorrencias_aluno_idx ON ocorrencias (aluno_id, data_ocorrencia DESC);
CREATE INDEX ocorrencias_autor_idx ON ocorrencias (autor_id);
CREATE INDEX ocorrencias_data_idx ON ocorrencias (data_ocorrencia DESC, criado_em DESC);

CREATE TRIGGER ocorrencias_set_atualizado_em
  BEFORE UPDATE ON ocorrencias
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Responsáveis que devem dar ciência (snapshot no registro, mesma regra dos avisos)
-- e quando deram.
CREATE TABLE ocorrencia_ciencias (
  ocorrencia_id  UUID        NOT NULL,
  usuario_id     UUID        NOT NULL,
  ciente_em      TIMESTAMPTZ,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ocorrencia_ciencias_pk PRIMARY KEY (ocorrencia_id, usuario_id),
  CONSTRAINT ocorrencia_ciencias_ocorrencia_fk
    FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias (id) ON DELETE CASCADE,
  CONSTRAINT ocorrencia_ciencias_usuario_fk
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT
);

CREATE INDEX ocorrencia_ciencias_usuario_idx ON ocorrencia_ciencias (usuario_id, ciente_em);

-- Down Migration

DROP TABLE IF EXISTS ocorrencia_ciencias;
DROP TABLE IF EXISTS ocorrencias;
