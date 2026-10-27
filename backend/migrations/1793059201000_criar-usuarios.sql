-- Up Migration

-- Usuários que fazem login no sistema (administração, professores e responsáveis).
-- Professores não têm tabela própria por enquanto: são usuários com tipo PROFESSOR.
CREATE TABLE usuarios (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           VARCHAR(150) NOT NULL,
  email          VARCHAR(255) NOT NULL,
  -- Somente o hash bcrypt é armazenado; nunca a senha em texto puro.
  senha_hash     VARCHAR(255) NOT NULL,
  tipo_usuario   VARCHAR(20)  NOT NULL,
  ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- CHECK em vez de ENUM: adicionar perfis no futuro é só recriar a constraint.
  CONSTRAINT usuarios_tipo_usuario_check
    CHECK (tipo_usuario IN ('ADMIN', 'PROFESSOR', 'RESPONSAVEL')),
  CONSTRAINT usuarios_nome_not_blank_check CHECK (BTRIM(nome) <> ''),
  -- E-mail sempre salvo em minúsculas e sem espaços nas pontas,
  -- assim o índice único abaixo já é case-insensitive na prática.
  CONSTRAINT usuarios_email_normalizado_check CHECK (email = LOWER(BTRIM(email)) AND email <> '')
);

CREATE UNIQUE INDEX usuarios_email_unique ON usuarios (email);
CREATE INDEX usuarios_tipo_usuario_idx ON usuarios (tipo_usuario);

CREATE TRIGGER usuarios_set_atualizado_em
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Down Migration

DROP TABLE IF EXISTS usuarios;
