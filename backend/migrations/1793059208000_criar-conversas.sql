-- Up Migration

-- Conversa entre um responsável e a escola, sempre SOBRE um aluno (é o aluno que define
-- quem pode falar com quem). Canal:
--   SECRETARIA: qualquer ADMIN atende (professor_usuario_id NULL);
--   PROFESSOR : conversa privada entre o responsável e aquele professor.
-- Leitura por LADO (não por pessoa): para a secretaria, qualquer ADMIN que leia conta.
CREATE TABLE conversas (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id                UUID          NOT NULL,
  responsavel_usuario_id  UUID          NOT NULL,
  canal                   VARCHAR(20)   NOT NULL,
  professor_usuario_id    UUID,
  assunto                 VARCHAR(150)  NOT NULL,
  iniciada_por            UUID          NOT NULL,
  ultima_mensagem_em      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  lida_responsavel_em     TIMESTAMPTZ,
  lida_escola_em          TIMESTAMPTZ,
  criado_em               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  atualizado_em           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT conversas_aluno_fk FOREIGN KEY (aluno_id) REFERENCES alunos (id) ON DELETE RESTRICT,
  CONSTRAINT conversas_responsavel_fk
    FOREIGN KEY (responsavel_usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT conversas_professor_fk
    FOREIGN KEY (professor_usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT conversas_iniciada_por_fk FOREIGN KEY (iniciada_por) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT conversas_canal_check CHECK (canal IN ('SECRETARIA', 'PROFESSOR')),
  -- Professor existe se, e somente se, o canal for PROFESSOR.
  CONSTRAINT conversas_professor_canal_check CHECK ((canal = 'PROFESSOR') = (professor_usuario_id IS NOT NULL)),
  CONSTRAINT conversas_assunto_check CHECK (BTRIM(assunto) <> '')
);

CREATE INDEX conversas_responsavel_idx ON conversas (responsavel_usuario_id, ultima_mensagem_em DESC);
CREATE INDEX conversas_professor_idx ON conversas (professor_usuario_id, ultima_mensagem_em DESC);
CREATE INDEX conversas_canal_idx ON conversas (canal, ultima_mensagem_em DESC);
CREATE INDEX conversas_aluno_idx ON conversas (aluno_id);

CREATE TRIGGER conversas_set_atualizado_em
  BEFORE UPDATE ON conversas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Mensagens não são editadas nem apagadas (é o histórico da conversa).
CREATE TABLE mensagens (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id  UUID         NOT NULL,
  autor_id     UUID         NOT NULL,
  conteudo     TEXT         NOT NULL,
  enviada_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT mensagens_conversa_fk FOREIGN KEY (conversa_id) REFERENCES conversas (id) ON DELETE CASCADE,
  CONSTRAINT mensagens_autor_fk FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT mensagens_conteudo_check CHECK (BTRIM(conteudo) <> '' AND LENGTH(conteudo) <= 5000)
);

CREATE INDEX mensagens_conversa_idx ON mensagens (conversa_id, enviada_em);

-- Down Migration

DROP TABLE IF EXISTS mensagens;
DROP TABLE IF EXISTS conversas;
