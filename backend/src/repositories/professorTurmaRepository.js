import { pool } from '../database/pool.js';
import { buscaSemAcento, containsPattern } from '../database/sqlHelpers.js';

const SELECT_ATRIBUICAO = `
  SELECT pt.id, pt.turma_id, pt.criado_em,
         pt.professor_id, u.nome AS professor_nome, u.email AS professor_email, u.ativo AS professor_ativo,
         pt.disciplina_id, d.nome AS disciplina_nome, d.ativo AS disciplina_ativo
  FROM professor_turma pt
  JOIN usuarios u ON u.id = pt.professor_id
  JOIN disciplinas d ON d.id = pt.disciplina_id`;

/** Atribuições da turma, agrupáveis por disciplina (ordem: disciplina, professor). */
export async function listByTurma(turmaId) {
  const { rows } = await pool.query(
    `${SELECT_ATRIBUICAO} WHERE pt.turma_id = $1 ORDER BY d.nome ASC, u.nome ASC, pt.id ASC`,
    [turmaId],
  );
  return rows;
}

/** O professor leciona (qualquer disciplina) nesta turma? */
export async function professorLecionaNaTurma(professorId, turmaId) {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM professor_turma WHERE professor_id = $1 AND turma_id = $2 LIMIT 1',
    [professorId, turmaId],
  );
  return rowCount > 0;
}

/** O aluno tem matrícula ativa em alguma turma ativa em que o professor leciona? */
export async function professorLecionaParaAluno(professorId, alunoId) {
  const { rowCount } = await pool.query(
    `SELECT 1
     FROM aluno_turma atm
     JOIN turmas t ON t.id = atm.turma_id AND t.ativo
     JOIN professor_turma pt ON pt.turma_id = atm.turma_id AND pt.professor_id = $1
     WHERE atm.aluno_id = $2 AND atm.ativo
     LIMIT 1`,
    [professorId, alunoId],
  );
  return rowCount > 0;
}

/** Alunos ATIVOS com matrícula ativa nas turmas ativas do professor (busca por nome/matrícula). */
export async function listAlunosDoProfessor(professorId, { busca, limit }) {
  const params = [professorId];
  let buscaSql = '';
  if (busca) {
    params.push(containsPattern(busca));
    buscaSql = `AND ${buscaSemAcento(['a.nome', 'a.matricula'], `$${params.length}`)}`;
  }
  params.push(limit);
  const { rows } = await pool.query(
    `SELECT DISTINCT a.id, a.nome, a.matricula
     FROM alunos a
     JOIN aluno_turma atm ON atm.aluno_id = a.id AND atm.ativo
     JOIN turmas t ON t.id = atm.turma_id AND t.ativo
     JOIN professor_turma pt ON pt.turma_id = t.id AND pt.professor_id = $1
     WHERE a.ativo ${buscaSql}
     ORDER BY a.nome ASC, a.id ASC
     LIMIT $${params.length}`,
    params,
  );
  return rows;
}

/** Turmas ATIVAS em que o professor leciona, com as disciplinas dele em cada uma. */
export async function listTurmasDoProfessor(professorId) {
  const { rows } = await pool.query(
    `SELECT t.id, t.nome, t.ano_letivo, t.turno,
            ARRAY_AGG(d.nome ORDER BY d.nome) AS disciplinas
     FROM professor_turma pt
     JOIN turmas t ON t.id = pt.turma_id AND t.ativo
     JOIN disciplinas d ON d.id = pt.disciplina_id
     WHERE pt.professor_id = $1
     GROUP BY t.id
     ORDER BY t.ano_letivo DESC, t.nome ASC`,
    [professorId],
  );
  return rows;
}

export async function findByIdForTurma(id, turmaId) {
  const { rows } = await pool.query(`${SELECT_ATRIBUICAO} WHERE pt.id = $1 AND pt.turma_id = $2`, [id, turmaId]);
  return rows[0] ?? null;
}

export async function create({ professorId, turmaId, disciplinaId }) {
  const { rows } = await pool.query(
    'INSERT INTO professor_turma (professor_id, turma_id, disciplina_id) VALUES ($1, $2, $3) RETURNING id',
    [professorId, turmaId, disciplinaId],
  );
  return rows[0].id;
}

export async function remove(id, turmaId) {
  const { rowCount } = await pool.query('DELETE FROM professor_turma WHERE id = $1 AND turma_id = $2', [
    id,
    turmaId,
  ]);
  return rowCount === 1;
}

/**
 * "Minhas turmas" do professor: alunos ATIVOS com matrícula ativa na turma e quantos
 * responsáveis podem receber comunicações (0 = não adianta mandar mensagem/aviso).
 */
export async function listAlunosDaTurmaComContato(turmaId) {
  const { rows } = await pool.query(
    `SELECT a.id, a.nome, a.matricula,
            (SELECT COUNT(*)::int
             FROM aluno_responsavel ar
             JOIN responsaveis r ON r.id = ar.responsavel_id
             JOIN usuarios u ON u.id = r.usuario_id AND u.ativo
             WHERE ar.aluno_id = a.id AND ar.autorizado_receber_comunicacoes) AS responsaveis_autorizados
     FROM aluno_turma atm
     JOIN alunos a ON a.id = atm.aluno_id AND a.ativo
     WHERE atm.turma_id = $1 AND atm.ativo
     ORDER BY a.nome ASC, a.id ASC`,
    [turmaId],
  );
  return rows;
}
