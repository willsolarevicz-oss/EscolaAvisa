import { pool } from '../database/pool.js';
import { buscaSemAcento, containsPattern } from '../database/sqlHelpers.js';

// Colunas públicas: senha_hash fica de fora para não vazar por engano.
const PUBLIC_COLUMNS = 'id, nome, email, tipo_usuario, ativo, anonimizado_em, criado_em, atualizado_em';

// As funções que gravam aceitam `db` (pool ou client de transação, ver withTransaction).

export async function findById(id, db = pool) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM usuarios WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Única função que devolve o hash da senha: uso exclusivo do login. */
export async function findByEmailWithPasswordHash(email) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}, senha_hash FROM usuarios WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}

/**
 * Lista paginada. Filtros opcionais: busca (nome ou e-mail), tipoUsuario, ativo.
 * @returns {Promise<{ rows: object[], total: number }>}
 */
export async function list({ page, pageSize, busca, tipoUsuario, ativo }) {
  const conditions = [];
  const params = [];

  if (busca) {
    params.push(containsPattern(busca));
    conditions.push(buscaSemAcento(['nome', 'email'], `$${params.length}`));
  }
  if (tipoUsuario) {
    params.push(tipoUsuario);
    conditions.push(`tipo_usuario = $${params.length}`);
  }
  if (ativo !== undefined) {
    params.push(ativo);
    conditions.push(`ativo = $${params.length}`);
  }

  // Só fragmentos fixos entram no SQL; os valores vão sempre em `params`.
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const pageParams = [...params, pageSize, (page - 1) * pageSize];

  const [countResult, pageResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM usuarios ${where}`, params),
    pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM usuarios ${where}
       ORDER BY nome ASC, id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      pageParams,
    ),
  ]);

  return { rows: pageResult.rows, total: countResult.rows[0].total };
}

export async function create({ nome, email, senhaHash, tipoUsuario, ativo = true }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_COLUMNS}`,
    [nome, email, senhaHash, tipoUsuario, ativo],
  );
  return rows[0];
}

/** Atualiza nome e e-mail. O perfil (tipo_usuario) é imutável depois da criação. */
export async function update(id, { nome, email }, db = pool) {
  const { rows } = await db.query(
    `UPDATE usuarios SET nome = $2, email = $3 WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`,
    [id, nome, email],
  );
  return rows[0] ?? null;
}

export async function setAtivo(id, ativo) {
  const { rows } = await pool.query(
    `UPDATE usuarios SET ativo = $2 WHERE id = $1 RETURNING ${PUBLIC_COLUMNS}`,
    [id, ativo],
  );
  return rows[0] ?? null;
}

/**
 * Anonimização (LGPD): troca nome, e-mail e senha por valores sem relação com a pessoa e apaga
 * telefone/CPF. O id continua (avisos, ocorrências e mensagens apontam para ele).
 * O e-mail usa o domínio reservado `.invalid` (nunca entrega) e o id, para continuar único.
 */
export async function anonimizar(id, senhaHashAleatoria, db = pool) {
  const { rows } = await db.query(
    `UPDATE usuarios
     SET nome = 'Usuário anonimizado',
         email = 'anonimizado+' || id::text || '@anonimizado.invalid',
         senha_hash = $2,
         ativo = FALSE,
         anonimizado_em = NOW()
     WHERE id = $1
     RETURNING ${PUBLIC_COLUMNS}`,
    [id, senhaHashAleatoria],
  );
  await db.query('UPDATE responsaveis SET telefone = NULL, cpf = NULL WHERE usuario_id = $1', [id]);
  return rows[0] ?? null;
}

export async function updatePasswordHash(id, senhaHash) {
  const { rowCount } = await pool.query('UPDATE usuarios SET senha_hash = $2 WHERE id = $1', [
    id,
    senhaHash,
  ]);
  return rowCount === 1;
}
