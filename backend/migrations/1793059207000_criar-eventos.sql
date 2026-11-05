-- Up Migration

-- Eventos do calendário escolar (provas, reuniões, recessos...). turma_id NULL = escola toda.
-- Diferente de avisos/ocorrências, não há leitura/ciência a preservar: o evento é
-- editado quando muda e excluído quando é cancelado.
-- Feriados nacionais NÃO ficam aqui: vêm da BrasilAPI na hora de montar o calendário.
CREATE TABLE eventos (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo         VARCHAR(150)  NOT NULL,
  descricao      TEXT,
  tipo           VARCHAR(20)   NOT NULL,
  data_inicio    DATE          NOT NULL,
  data_fim       DATE          NOT NULL,
  turma_id       UUID,
  autor_id       UUID          NOT NULL,
  criado_em      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT eventos_turma_fk FOREIGN KEY (turma_id) REFERENCES turmas (id) ON DELETE RESTRICT,
  CONSTRAINT eventos_autor_fk FOREIGN KEY (autor_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT eventos_tipo_check CHECK (tipo IN ('PROVA', 'REUNIAO', 'RECESSO', 'EVENTO', 'OUTRO')),
  CONSTRAINT eventos_titulo_check CHECK (BTRIM(titulo) <> ''),
  CONSTRAINT eventos_descricao_check CHECK (descricao IS NULL OR LENGTH(descricao) <= 2000),
  CONSTRAINT eventos_datas_check CHECK (data_inicio >= DATE '2000-01-01' AND data_fim >= data_inicio)
);

-- O calendário busca eventos que cruzam um mês (data_inicio <= fim do mês AND data_fim >= início).
CREATE INDEX eventos_periodo_idx ON eventos (data_inicio, data_fim);
CREATE INDEX eventos_turma_idx ON eventos (turma_id);
CREATE INDEX eventos_autor_idx ON eventos (autor_id);

CREATE TRIGGER eventos_set_atualizado_em
  BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Down Migration

DROP TABLE IF EXISTS eventos;
