-- Up Migration

-- Função reutilizada pelos triggers de todas as tabelas com "atualizado_em".
-- Garante que o campo seja atualizado mesmo se o código esquecer de fazê-lo.
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Down Migration

DROP FUNCTION IF EXISTS set_atualizado_em();
