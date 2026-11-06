-- Up Migration

-- Trilha de auditoria: toda requisição que ALTERA dados (POST/PUT/PATCH/DELETE), incluindo
-- tentativas de login. Grava QUEM, O QUÊ (rota normalizada), SOBRE QUAL registro, o RESULTADO
-- (status HTTP) e o IP. NUNCA grava o corpo da requisição (senhas e dados pessoais ficam fora).
CREATE TABLE auditoria (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID,
  metodo      VARCHAR(10)   NOT NULL,
  rota        VARCHAR(200)  NOT NULL,
  recurso_id  UUID,
  status      SMALLINT      NOT NULL,
  ip          VARCHAR(64),
  criado_em   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Usuários não são apagados (são desativados); SET NULL só por garantia.
  CONSTRAINT auditoria_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL,
  CONSTRAINT auditoria_metodo_check CHECK (metodo IN ('POST', 'PUT', 'PATCH', 'DELETE')),
  CONSTRAINT auditoria_status_check CHECK (status BETWEEN 100 AND 599)
);

CREATE INDEX auditoria_criado_idx ON auditoria (criado_em DESC);
CREATE INDEX auditoria_usuario_idx ON auditoria (usuario_id, criado_em DESC);

-- Down Migration

DROP TABLE IF EXISTS auditoria;
