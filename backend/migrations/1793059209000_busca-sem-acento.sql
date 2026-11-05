-- Up Migration

-- unaccent: extensão oficial do PostgreSQL que remove acentos ("João" → "Joao").
-- As buscas comparam unaccent(coluna) ILIKE unaccent(termo), então "joao" acha "João"
-- e "joão" acha "Joao". É "trusted" desde o PostgreSQL 13: o dono do banco pode criá-la.
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Down Migration

DROP EXTENSION IF EXISTS unaccent;
