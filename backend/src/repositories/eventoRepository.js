import { pool } from '../database/pool.js';
import { responsaveisAutorizadosSql } from '../database/responsaveisAutorizados.js';

const SELECT_EVENTO = `
  SELECT e.id, e.titulo, e.descricao, e.tipo, e.data_inicio, e.data_fim, e.criado_em, e.atualizado_em,
         e.turma_id, t.nome AS turma_nome,
         e.autor_id, au.nome AS autor_nome
  FROM eventos e
  JOIN usuarios au ON au.id = e.autor_id
  LEFT JOIN turmas t ON t.id = e.turma_id`;

// Evento que cruza o período [$1, $2] (inclusive), mesmo começando antes ou terminando depois.
const NO_PERIODO = 'e.data_inicio <= $2::date AND e.data_fim >= $1::date';
const ORDEM = 'ORDER BY e.data_inicio ASC, e.data_fim ASC, e.titulo ASC, e.id ASC';

export async function findById(id) {
  const { rows } = await pool.query(`${SELECT_EVENTO} WHERE e.id = $1`, [id]);
  return rows[0] ?? null;
}

/** ADMIN: todos os eventos do período. */
export async function listNoPeriodo({ inicio, fim }) {
  const { rows } = await pool.query(`${SELECT_EVENTO} WHERE ${NO_PERIODO} ${ORDEM}`, [inicio, fim]);
  return rows;
}

/** PROFESSOR: escola toda + turmas em que leciona + os que ele mesmo criou. */
export async function listNoPeriodoParaProfessor({ inicio, fim, professorId }) {
  const { rows } = await pool.query(
    `${SELECT_EVENTO}
     WHERE ${NO_PERIODO}
       AND (e.turma_id IS NULL
            OR e.autor_id = $3
            OR EXISTS (SELECT 1 FROM professor_turma pt WHERE pt.turma_id = e.turma_id AND pt.professor_id = $3))
     ${ORDEM}`,
    [inicio, fim, professorId],
  );
  return rows;
}

/**
 * RESPONSAVEL: escola toda + turmas em que algum aluno dele tem matrícula ativa.
 * Mesma regra de vínculo das comunicações (responsável autorizado, aluno ativo).
 */
export async function listNoPeriodoParaResponsavel({ inicio, fim, usuarioId }) {
  const { rows } = await pool.query(
    `${SELECT_EVENTO}
     WHERE ${NO_PERIODO}
       AND (e.turma_id IS NULL
            OR $3::uuid IN (${responsaveisAutorizadosSql(
              `EXISTS (SELECT 1 FROM aluno_turma atm
                       WHERE atm.aluno_id = a.id AND atm.turma_id = e.turma_id AND atm.ativo)`,
            )}))
     ${ORDEM}`,
    [inicio, fim, usuarioId],
  );
  return rows;
}

export async function create({ titulo, descricao, tipo, dataInicio, dataFim, turmaId, autorId }) {
  const { rows } = await pool.query(
    `INSERT INTO eventos (titulo, descricao, tipo, data_inicio, data_fim, turma_id, autor_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [titulo, descricao, tipo, dataInicio, dataFim, turmaId, autorId],
  );
  return rows[0].id;
}

/** O autor não muda na edição (o admin corrigindo um evento de professor não "rouba" a autoria). */
export async function update(id, { titulo, descricao, tipo, dataInicio, dataFim, turmaId }) {
  const { rowCount } = await pool.query(
    `UPDATE eventos
     SET titulo = $2, descricao = $3, tipo = $4, data_inicio = $5, data_fim = $6, turma_id = $7
     WHERE id = $1`,
    [id, titulo, descricao, tipo, dataInicio, dataFim, turmaId],
  );
  return rowCount === 1;
}

export async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM eventos WHERE id = $1', [id]);
  return rowCount === 1;
}
