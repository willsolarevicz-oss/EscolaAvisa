import { pool } from '../database/pool.js';

/**
 * Turmas ATIVAS com as disciplinas lecionadas (via professor_turma), para escolher a grade.
 * Com `professorId`, só as combinações atribuídas a esse professor.
 */
export async function listTurmasComDisciplinas(professorId = null) {
  const { rows } = await pool.query(
    `SELECT t.id, t.nome, t.ano_letivo, t.turno,
            JSON_AGG(JSON_BUILD_OBJECT('id', d.id, 'nome', d.nome) ORDER BY d.nome) AS disciplinas
     FROM turmas t
     JOIN (SELECT DISTINCT turma_id, disciplina_id
           FROM professor_turma
           WHERE $1::uuid IS NULL OR professor_id = $1::uuid) pt ON pt.turma_id = t.id
     JOIN disciplinas d ON d.id = pt.disciplina_id
     WHERE t.ativo
     GROUP BY t.id
     ORDER BY t.ano_letivo DESC, t.nome ASC`,
    [professorId],
  );
  return rows;
}

/** A disciplina é lecionada na turma (por qualquer professor, ou pelo `professorId` informado)? */
export async function disciplinaLecionadaNaTurma(turmaId, disciplinaId, professorId = null) {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM professor_turma
     WHERE turma_id = $1 AND disciplina_id = $2 AND ($3::uuid IS NULL OR professor_id = $3::uuid)
     LIMIT 1`,
    [turmaId, disciplinaId, professorId],
  );
  return rowCount > 0;
}

/** Alunos com matrícula ATIVA na turma + suas notas na disciplina (uma linha por nota). */
export async function listGrade(turmaId, disciplinaId) {
  const { rows } = await pool.query(
    `SELECT a.id AS aluno_id, a.nome AS aluno_nome, a.matricula AS aluno_matricula, n.bimestre, n.valor
     FROM aluno_turma atm
     JOIN alunos a ON a.id = atm.aluno_id
     LEFT JOIN notas n ON n.aluno_id = a.id AND n.turma_id = atm.turma_id AND n.disciplina_id = $2
     WHERE atm.turma_id = $1 AND atm.ativo
     ORDER BY a.nome ASC, a.id ASC, n.bimestre ASC`,
    [turmaId, disciplinaId],
  );
  return rows;
}

/** Quais dos alunos informados têm matrícula ativa na turma. */
export async function alunosMatriculados(turmaId, alunoIds) {
  const { rows } = await pool.query(
    'SELECT aluno_id FROM aluno_turma WHERE turma_id = $1 AND ativo AND aluno_id = ANY($2::uuid[])',
    [turmaId, alunoIds],
  );
  return new Set(rows.map((r) => r.aluno_id));
}

/** Lança ou corrige uma nota (upsert pela chave aluno + turma + disciplina + bimestre). */
export async function upsert({ alunoId, turmaId, disciplinaId, bimestre, valor, lancadoPor }, db = pool) {
  await db.query(
    `INSERT INTO notas (aluno_id, turma_id, disciplina_id, bimestre, valor, lancado_por)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (aluno_id, turma_id, disciplina_id, bimestre)
     DO UPDATE SET valor = EXCLUDED.valor, lancado_por = EXCLUDED.lancado_por`,
    [alunoId, turmaId, disciplinaId, bimestre, valor, lancadoPor],
  );
}

export async function remove({ alunoId, turmaId, disciplinaId, bimestre }, db = pool) {
  await db.query(
    'DELETE FROM notas WHERE aluno_id = $1 AND turma_id = $2 AND disciplina_id = $3 AND bimestre = $4',
    [alunoId, turmaId, disciplinaId, bimestre],
  );
}

/**
 * Boletim do responsável: alunos ATIVOS com vínculo AUTORIZADO, nas turmas em que têm
 * matrícula ativa, com as disciplinas da turma (lecionadas ou com nota) e as notas.
 */
export async function boletimDoResponsavel(usuarioId) {
  const { rows } = await pool.query(
    `WITH meus_alunos AS (
       SELECT DISTINCT a.id, a.nome, a.matricula
       FROM aluno_responsavel ar
       JOIN responsaveis r ON r.id = ar.responsavel_id
       JOIN alunos a ON a.id = ar.aluno_id AND a.ativo
       WHERE r.usuario_id = $1 AND ar.autorizado_receber_comunicacoes
     ),
     matriculas AS (
       SELECT ma.id AS aluno_id, ma.nome AS aluno_nome, ma.matricula AS aluno_matricula,
              t.id AS turma_id, t.nome AS turma_nome, t.ano_letivo
       FROM meus_alunos ma
       JOIN aluno_turma atm ON atm.aluno_id = ma.id AND atm.ativo
       JOIN turmas t ON t.id = atm.turma_id
     ),
     disciplinas_da_turma AS (
       SELECT turma_id, disciplina_id FROM professor_turma
       UNION
       SELECT turma_id, disciplina_id FROM notas
     )
     SELECT m.aluno_id, m.aluno_nome, m.aluno_matricula, m.turma_id, m.turma_nome, m.ano_letivo,
            d.id AS disciplina_id, d.nome AS disciplina_nome, n.bimestre, n.valor
     FROM matriculas m
     LEFT JOIN disciplinas_da_turma dt ON dt.turma_id = m.turma_id
     LEFT JOIN disciplinas d ON d.id = dt.disciplina_id
     LEFT JOIN notas n ON n.aluno_id = m.aluno_id AND n.turma_id = m.turma_id AND n.disciplina_id = d.id
     ORDER BY m.aluno_nome ASC, m.ano_letivo DESC, d.nome ASC, n.bimestre ASC`,
    [usuarioId],
  );
  return rows;
}
