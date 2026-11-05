import { pool } from '../database/pool.js';
import { responsaveisAutorizadosSql } from '../database/responsaveisAutorizados.js';
import { buscaSemAcento, containsPattern } from '../database/sqlHelpers.js';

// Aviso + nomes (autor, turma, aluno) + contagem de destinatários e de leituras.
const SELECT_AVISO = `
  SELECT av.id, av.titulo, av.conteudo, av.publico, av.ativo, av.publicado_em, av.criado_em, av.atualizado_em,
         av.autor_id, au.nome AS autor_nome,
         av.turma_id, t.nome AS turma_nome, t.ano_letivo AS turma_ano_letivo,
         av.aluno_id, al.nome AS aluno_nome,
         (SELECT COUNT(*)::int FROM aviso_destinatarios d WHERE d.aviso_id = av.id) AS total_destinatarios,
         (SELECT COUNT(*)::int FROM aviso_destinatarios d
          WHERE d.aviso_id = av.id AND d.visualizado_em IS NOT NULL) AS total_lidos
  FROM avisos av
  JOIN usuarios au ON au.id = av.autor_id
  LEFT JOIN turmas t ON t.id = av.turma_id
  LEFT JOIN alunos al ON al.id = av.aluno_id`;

export async function findById(id, db = pool) {
  const { rows } = await db.query(`${SELECT_AVISO} WHERE av.id = $1`, [id]);
  return rows[0] ?? null;
}

/** Lista para quem publica. `autorId` restringe aos avisos do próprio autor (professor). */
export async function list({ page, pageSize, busca, publico, ativo, autorId }) {
  const conditions = [];
  const params = [];

  if (busca) {
    params.push(containsPattern(busca));
    conditions.push(buscaSemAcento(['av.titulo'], `$${params.length}`));
  }
  if (publico) {
    params.push(publico);
    conditions.push(`av.publico = $${params.length}`);
  }
  if (ativo !== undefined) {
    params.push(ativo);
    conditions.push(`av.ativo = $${params.length}`);
  }
  if (autorId) {
    params.push(autorId);
    conditions.push(`av.autor_id = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countResult, pageResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM avisos av ${where}`, params),
    pool.query(
      `${SELECT_AVISO} ${where}
       ORDER BY av.publicado_em DESC, av.id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);

  return { rows: pageResult.rows, total: countResult.rows[0].total };
}

export async function create({ titulo, conteudo, publico, turmaId, alunoId, autorId }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO avisos (titulo, conteudo, publico, turma_id, aluno_id, autor_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [titulo, conteudo, publico, turmaId, alunoId, autorId],
  );
  return rows[0].id;
}

/**
 * Grava os destinatários (snapshot): responsáveis ATIVOS, AUTORIZADOS a receber
 * comunicações, de alunos ATIVOS do público do aviso. Devolve quantos foram gravados.
 */
export async function insertDestinatarios({ avisoId, publico, turmaId, alunoId }, db = pool) {
  const alunosDoPublico = `
    $2::text = 'TODOS'
    OR ($2::text = 'ALUNO' AND a.id = $4::uuid)
    OR ($2::text = 'TURMA' AND EXISTS (
          SELECT 1 FROM aluno_turma atm
          WHERE atm.aluno_id = a.id AND atm.turma_id = $3::uuid AND atm.ativo))`;
  const { rowCount } = await db.query(
    `INSERT INTO aviso_destinatarios (aviso_id, usuario_id)
     SELECT $1::uuid, destinatario.usuario_id
     FROM (${responsaveisAutorizadosSql(alunosDoPublico)}) AS destinatario`,
    [avisoId, publico, turmaId, alunoId],
  );
  return rowCount;
}

/** Destinatários com situação de leitura: quem ainda não leu aparece primeiro. */
export async function listDestinatarios(avisoId) {
  const { rows } = await pool.query(
    `SELECT d.usuario_id, u.nome, u.email, d.visualizado_em
     FROM aviso_destinatarios d
     JOIN usuarios u ON u.id = d.usuario_id
     WHERE d.aviso_id = $1
     ORDER BY d.visualizado_em IS NOT NULL, u.nome ASC`,
    [avisoId],
  );
  return rows;
}

export async function setAtivo(id, ativo) {
  const { rowCount } = await pool.query('UPDATE avisos SET ativo = $2 WHERE id = $1', [id, ativo]);
  return rowCount === 1;
}

// ---------- Visão do responsável (destinatário) ----------

const SELECT_MEU_AVISO = `
  SELECT av.id, av.titulo, av.conteudo, av.publico, av.publicado_em,
         au.nome AS autor_nome, t.nome AS turma_nome, al.nome AS aluno_nome,
         d.visualizado_em
  FROM aviso_destinatarios d
  JOIN avisos av ON av.id = d.aviso_id AND av.ativo
  JOIN usuarios au ON au.id = av.autor_id
  LEFT JOIN turmas t ON t.id = av.turma_id
  LEFT JOIN alunos al ON al.id = av.aluno_id`;

/** Avisos ativos destinados ao usuário, mais recentes primeiro. `naoLidos` filtra os não lidos. */
export async function listForUsuario(usuarioId, { page, pageSize, naoLidos }) {
  const naoLidosSql = naoLidos ? 'AND d.visualizado_em IS NULL' : '';
  const [countResult, pageResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM aviso_destinatarios d JOIN avisos av ON av.id = d.aviso_id AND av.ativo
       WHERE d.usuario_id = $1 ${naoLidosSql}`,
      [usuarioId],
    ),
    pool.query(
      `${SELECT_MEU_AVISO}
       WHERE d.usuario_id = $1 ${naoLidosSql}
       ORDER BY av.publicado_em DESC, av.id ASC
       LIMIT $2 OFFSET $3`,
      [usuarioId, pageSize, (page - 1) * pageSize],
    ),
  ]);
  return { rows: pageResult.rows, total: countResult.rows[0].total };
}

export async function findForUsuario(avisoId, usuarioId) {
  const { rows } = await pool.query(`${SELECT_MEU_AVISO} WHERE d.aviso_id = $1 AND d.usuario_id = $2`, [
    avisoId,
    usuarioId,
  ]);
  return rows[0] ?? null;
}

/** Marca como lido. Idempotente: a primeira leitura é preservada (COALESCE). */
export async function marcarLido(avisoId, usuarioId) {
  const { rows } = await pool.query(
    `UPDATE aviso_destinatarios d SET visualizado_em = COALESCE(d.visualizado_em, NOW())
     FROM avisos av
     WHERE d.aviso_id = $1 AND d.usuario_id = $2 AND av.id = d.aviso_id AND av.ativo
     RETURNING d.visualizado_em`,
    [avisoId, usuarioId],
  );
  return rows[0]?.visualizado_em ?? null;
}
