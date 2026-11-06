-- Up Migration

-- Aceite da Política de Privacidade e dos Termos de Uso (LGPD: transparência e registro).
-- Uma linha por usuário e versão dos documentos: quando o texto muda, a versão muda e o
-- usuário precisa ler e aceitar de novo. O histórico de versões aceitas fica guardado.
CREATE TABLE aceites_termos (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID         NOT NULL,
  versao      VARCHAR(20)  NOT NULL,
  aceito_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ip          VARCHAR(64),

  CONSTRAINT aceites_termos_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
  CONSTRAINT aceites_termos_unique UNIQUE (usuario_id, versao),
  CONSTRAINT aceites_termos_versao_check CHECK (BTRIM(versao) <> '')
);

-- Anonimização a pedido do titular (LGPD art. 18): os dados pessoais do usuário são
-- substituídos, mas o registro continua (avisos, ocorrências e mensagens apontam para ele).
ALTER TABLE usuarios ADD COLUMN anonimizado_em TIMESTAMPTZ;

-- Down Migration

ALTER TABLE usuarios DROP COLUMN IF EXISTS anonimizado_em;
DROP TABLE IF EXISTS aceites_termos;
