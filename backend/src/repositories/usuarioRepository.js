import { query } from '../database/pool.js';

// Colunas públicas: senha_hash fica de fora para não vazar por engano.
const PUBLIC_COLUMNS = 'id, nome, email, tipo_usuario, ativo, criado_em, atualizado_em';

export async function findById(id) {
  const { rows } = await query(`SELECT ${PUBLIC_COLUMNS} FROM usuarios WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Única função que devolve o hash da senha: uso exclusivo do login. */
export async function findByEmailWithPasswordHash(email) {
  const { rows } = await query(
    `SELECT ${PUBLIC_COLUMNS}, senha_hash FROM usuarios WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function create({ nome, email, senhaHash, tipoUsuario, ativo = true }) {
  const { rows } = await query(
    `INSERT INTO usuarios (nome, email, senha_hash, tipo_usuario, ativo)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_COLUMNS}`,
    [nome, email, senhaHash, tipoUsuario, ativo],
  );
  return rows[0];
}
