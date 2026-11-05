import { pool } from '../database/pool.js';
import { responsaveisAutorizadosSql } from '../database/responsaveisAutorizados.js';
import { buscaSemAcento, containsPattern } from '../database/sqlHelpers.js';

// Ocorrência + nomes (aluno, autor) + contagem de responsáveis e de ciências.
const SELECT_OCORRENCIA = `
  SELECT o.id, o.tipo, o.descricao, o.data_ocorrencia, o.ativo, o.criado_em, o.atualizado_em,
         o.aluno_id, al.nome AS aluno_nome, al.matricula AS aluno_matricula,
         o.autor_id, au.nome AS autor_nome,
         (SELECT COUNT(*)::int FROM ocorrencia_ciencias c WHERE c.ocorrencia_id = o.id) AS total_responsaveis,
         (SELECT COUNT(*)::int FROM ocorrencia_ciencias c
          WHERE c.ocorrencia_id = o.id AND c.ciente_em IS NOT NULL) AS total_cientes
  FROM ocorrencias o
  JOIN alunos al ON al.id = o.aluno_id
  JOIN usuarios au ON au.id = o.autor_id`;

export async function findById(id) {
  const { rows } = await pool.query(`${SELECT_OCORRENCIA} WHERE o.id = $1`, [id]);
  return rows[0] ?? null;
}

/**
 * Lista para quem registra. Filtros: busca (nome do aluno), tipo, ativo, alunoId;
 * `autorId` restringe às ocorrências do próprio autor (professor).
 */
export async function list({ page, pageSize, busca, tipo, ativo, alunoId, autorId }) {
  const conditions = [];
  const params = [];

  if (busca) {
    params.push(containsPattern(busca));
    conditions.push(buscaSemAcento(['al.nome'], `$${params.length}`));
  }
  if (tipo) {
    params.push(tipo);
    conditions.push(`o.tipo = $${params.length}`);
  }
  if (ativo !== undefined) {
    params.push(ativo);
    conditions.push(`o.ativo = $${params.length}`);
  }
  if (alunoId) {
    params.push(alunoId);
    conditions.push(`o.aluno_id = $${params.length}`);
  }
  if (autorId) {
    params.push(autorId);
    conditions.push(`o.autor_id = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countResult, pageResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM ocorrencias o JOIN alunos al ON al.id = o.aluno_id ${where}`, params),
    pool.query(
      `${SELECT_OCORRENCIA} ${where}
       ORDER BY o.data_ocorrencia DESC, o.criado_em DESC, o.id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);

  return { rows: pageResult.rows, total: countResult.rows[0].total };
}

export async function create({ alunoId, tipo, descricao, dataOcorrencia, autorId }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO ocorrencias (aluno_id, tipo, descricao, data_ocorrencia, autor_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [alunoId, tipo, descricao, dataOcorrencia, autorId],
  );
  return rows[0].id;
}

/** Grava os responsáveis que devem dar ciência (snapshot). Devolve quantos. */
export async function insertCiencias({ ocorrenciaId, alunoId }, db = pool) {
  const { rowCount } = await db.query(
    `INSERT INTO ocorrencia_ciencias (ocorrencia_id, usuario_id)
     SELECT $1::uuid, responsavel.usuario_id
     FROM (${responsaveisAutorizadosSql('a.id = $2::uuid')}) AS responsavel`,
    [ocorrenciaId, alunoId],
  );
  return rowCount;
}

/** Responsáveis e situação de ciência: quem ainda não deu ciência aparece primeiro. */
export async function listCiencias(ocorrenciaId) {
  const { rows } = await pool.query(
    `SELECT c.usuario_id, u.nome, u.email, c.ciente_em
     FROM ocorrencia_ciencias c
     JOIN usuarios u ON u.id = c.usuario_id
     WHERE c.ocorrencia_id = $1
     ORDER BY c.ciente_em IS NOT NULL, u.nome ASC`,
    [ocorrenciaId],
  );
  return rows;
}

export async function setAtivo(id, ativo) {
  const { rowCount } = await pool.query('UPDATE ocorrencias SET ativo = $2 WHERE id = $1', [id, ativo]);
  return rowCount === 1;
}

// ---------- Visão do responsável ----------

const SELECT_MINHA_OCORRENCIA = `
  SELECT o.id, o.tipo, o.descricao, o.data_ocorrencia, o.criado_em,
         al.nome AS aluno_nome, au.nome AS autor_nome, c.ciente_em
  FROM ocorrencia_ciencias c
  JOIN ocorrencias o ON o.id = c.ocorrencia_id AND o.ativo
  JOIN alunos al ON al.id = o.aluno_id
  JOIN usuarios au ON au.id = o.autor_id`;

/** Ocorrências ativas para o responsável dar ciência. `pendentes` filtra as sem ciência. */
export async function listForUsuario(usuarioId, { page, pageSize, pendentes }) {
  const pendentesSql = pendentes ? 'AND c.ciente_em IS NULL' : '';
  const [countResult, pageResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM ocorrencia_ciencias c JOIN ocorrencias o ON o.id = c.ocorrencia_id AND o.ativo
       WHERE c.usuario_id = $1 ${pendentesSql}`,
      [usuarioId],
    ),
    pool.query(
      `${SELECT_MINHA_OCORRENCIA}
       WHERE c.usuario_id = $1 ${pendentesSql}
       ORDER BY o.data_ocorrencia DESC, o.criado_em DESC, o.id ASC
       LIMIT $2 OFFSET $3`,
      [usuarioId, pageSize, (page - 1) * pageSize],
    ),
  ]);
  return { rows: pageResult.rows, total: countResult.rows[0].total };
}

export async function findForUsuario(ocorrenciaId, usuarioId) {
  const { rows } = await pool.query(`${SELECT_MINHA_OCORRENCIA} WHERE c.ocorrencia_id = $1 AND c.usuario_id = $2`, [
    ocorrenciaId,
    usuarioId,
  ]);
  return rows[0] ?? null;
}

/** "Estou ciente". Idempotente: a primeira ciência é preservada (COALESCE). */
export async function registrarCiencia(ocorrenciaId, usuarioId) {
  const { rows } = await pool.query(
    `UPDATE ocorrencia_ciencias c SET ciente_em = COALESCE(c.ciente_em, NOW())
     FROM ocorrencias o
     WHERE c.ocorrencia_id = $1 AND c.usuario_id = $2 AND o.id = c.ocorrencia_id AND o.ativo
     RETURNING c.ciente_em`,
    [ocorrenciaId, usuarioId],
  );
  return rows[0]?.ciente_em ?? null;
}
