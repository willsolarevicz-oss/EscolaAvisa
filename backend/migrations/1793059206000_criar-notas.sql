-- Up Migration

-- Notas por bimestre (4 por ano letivo), escala 0 a 10 com uma casa decimal.
-- A média NÃO é gravada: é calculada a partir dos bimestres lançados (ver PROGRESSO.md).
CREATE TABLE notas (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id       UUID          NOT NULL,
  turma_id       UUID          NOT NULL,
  disciplina_id  UUID          NOT NULL,
  bimestre       SMALLINT      NOT NULL,
  -- NUMERIC(3,1): uma casa decimal exata (sem erro de ponto flutuante).
  valor          NUMERIC(3, 1) NOT NULL,
  -- Último usuário que lançou/alterou a nota (professor ou administração).
  lancado_por    UUID          NOT NULL,
  criado_em      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT notas_aluno_fk FOREIGN KEY (aluno_id) REFERENCES alunos (id) ON DELETE RESTRICT,
  CONSTRAINT notas_turma_fk FOREIGN KEY (turma_id) REFERENCES turmas (id) ON DELETE RESTRICT,
  CONSTRAINT notas_disciplina_fk FOREIGN KEY (disciplina_id) REFERENCES disciplinas (id) ON DELETE RESTRICT,
  CONSTRAINT notas_lancado_por_fk FOREIGN KEY (lancado_por) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT notas_bimestre_check CHECK (bimestre BETWEEN 1 AND 4),
  CONSTRAINT notas_valor_check CHECK (valor BETWEEN 0 AND 10),
  -- Uma nota por aluno, turma, disciplina e bimestre (o lançamento faz upsert).
  CONSTRAINT notas_unique UNIQUE (aluno_id, turma_id, disciplina_id, bimestre)
);

-- Grade de lançamento (turma + disciplina) e boletim (aluno).
CREATE INDEX notas_turma_disciplina_idx ON notas (turma_id, disciplina_id);

CREATE TRIGGER notas_set_atualizado_em
  BEFORE UPDATE ON notas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Down Migration

DROP TABLE IF EXISTS notas;
