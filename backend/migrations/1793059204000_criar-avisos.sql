-- Up Migration

-- Comunicados da escola. Não são editados depois de publicados (ver PROGRESSO.md):
-- para corrigir, arquiva-se (ativo = false) e publica-se outro.
CREATE TABLE avisos (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo         VARCHAR(150) NOT NULL,
  conteudo       TEXT         NOT NULL,
  autor_id       UUID         NOT NULL,
  -- Público-alvo: todos os alunos ativos, uma turma ou um aluno específico.
  publico        VARCHAR(10)  NOT NULL,
  turma_id       UUID,
  aluno_id       UUID,
  ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
  publicado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT avisos_autor_fk FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT avisos_turma_fk FOREIGN KEY (turma_id) REFERENCES turmas (id) ON DELETE RESTRICT,
  CONSTRAINT avisos_aluno_fk FOREIGN KEY (aluno_id) REFERENCES alunos (id) ON DELETE RESTRICT,
  CONSTRAINT avisos_titulo_not_blank_check CHECK (BTRIM(titulo) <> ''),
  CONSTRAINT avisos_conteudo_check CHECK (BTRIM(conteudo) <> '' AND LENGTH(conteudo) <= 10000),
  CONSTRAINT avisos_publico_check CHECK (publico IN ('TODOS', 'TURMA', 'ALUNO')),
  -- O alvo precisa bater com o público: TURMA exige turma; ALUNO exige aluno; TODOS não tem nenhum.
  CONSTRAINT avisos_publico_alvo_check CHECK (
    (publico = 'TODOS' AND turma_id IS NULL AND aluno_id IS NULL)
    OR (publico = 'TURMA' AND turma_id IS NOT NULL AND aluno_id IS NULL)
    OR (publico = 'ALUNO' AND aluno_id IS NOT NULL AND turma_id IS NULL)
  )
);

CREATE INDEX avisos_publicado_em_idx ON avisos (publicado_em DESC);
CREATE INDEX avisos_autor_idx ON avisos (autor_id);
CREATE INDEX avisos_turma_idx ON avisos (turma_id) WHERE turma_id IS NOT NULL;
CREATE INDEX avisos_aluno_idx ON avisos (aluno_id) WHERE aluno_id IS NOT NULL;

CREATE TRIGGER avisos_set_atualizado_em
  BEFORE UPDATE ON avisos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Quem deveria receber o aviso, gravado no momento da publicação (snapshot),
-- e quando leu. O relatório "lido por X de Y" não muda se alunos trocarem de turma depois.
CREATE TABLE aviso_destinatarios (
  aviso_id        UUID        NOT NULL,
  usuario_id      UUID        NOT NULL,
  visualizado_em  TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT aviso_destinatarios_pk PRIMARY KEY (aviso_id, usuario_id),
  CONSTRAINT aviso_destinatarios_aviso_fk
    FOREIGN KEY (aviso_id) REFERENCES avisos (id) ON DELETE CASCADE,
  CONSTRAINT aviso_destinatarios_usuario_fk
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT
);

-- "Meus avisos" e contagem de não lidos do responsável.
CREATE INDEX aviso_destinatarios_usuario_idx ON aviso_destinatarios (usuario_id, visualizado_em);

-- Down Migration

DROP TABLE IF EXISTS aviso_destinatarios;
DROP TABLE IF EXISTS avisos;
