import { pool } from '../database/pool.js';

/*
 * Consultas dos relatórios. Parâmetros fixos em todas as de período:
 *   $1 = início (AAAA-MM-DD), $2 = fim (inclusive), $3 = autor (NULL = todos; professor = ele mesmo).
 * Só entram registros ATIVOS (o que o responsável de fato vê).
 */

// ---------- Avisos ----------

// publicado_em é data+hora: "até o fim do dia `fim`" = antes da meia-noite do dia seguinte.
const FILTRO_AVISOS = `av.ativo
  AND av.publicado_em >= $1::date AND av.publicado_em < ($2::date + 1)
  AND ($3::uuid IS NULL OR av.autor_id = $3::uuid)`;

export async function resumoAvisos(params) {
  const { rows } = await pool.query(
    `SELECT COUNT(DISTINCT av.id)::int AS avisos,
            COUNT(d.usuario_id)::int AS destinatarios,
            COUNT(d.visualizado_em)::int AS lidos
     FROM avisos av
     LEFT JOIN aviso_destinatarios d ON d.aviso_id = av.id
     WHERE ${FILTRO_AVISOS}`,
    params,
  );
  return rows[0];
}

/** Cada aviso do período com destinatários e leituras (mais recentes primeiro; no máximo `limite`). */
export async function listAvisosComLeitura(params, limite) {
  const { rows } = await pool.query(
    `SELECT av.id, av.titulo, av.publico, av.publicado_em,
            t.nome AS turma_nome, al.nome AS aluno_nome, au.nome AS autor_nome,
            COUNT(d.usuario_id)::int AS destinatarios,
            COUNT(d.visualizado_em)::int AS lidos
     FROM avisos av
     JOIN usuarios au ON au.id = av.autor_id
     LEFT JOIN turmas t ON t.id = av.turma_id
     LEFT JOIN alunos al ON al.id = av.aluno_id
     LEFT JOIN aviso_destinatarios d ON d.aviso_id = av.id
     WHERE ${FILTRO_AVISOS}
     GROUP BY av.id, t.nome, al.nome, au.nome
     ORDER BY av.publicado_em DESC, av.id ASC
     LIMIT $4`,
    [...params, limite],
  );
  return rows;
}

/** Leitura dos avisos enviados para cada turma (público TURMA). */
export async function leituraPorTurma(params) {
  const { rows } = await pool.query(
    `SELECT t.id, t.nome, t.ano_letivo,
            COUNT(DISTINCT av.id)::int AS avisos,
            COUNT(d.usuario_id)::int AS destinatarios,
            COUNT(d.visualizado_em)::int AS lidos
     FROM avisos av
     JOIN turmas t ON t.id = av.turma_id
     LEFT JOIN aviso_destinatarios d ON d.aviso_id = av.id
     WHERE ${FILTRO_AVISOS} AND av.publico = 'TURMA'
     GROUP BY t.id
     ORDER BY t.ano_letivo DESC, t.nome ASC`,
    params,
  );
  return rows;
}

/** Responsáveis com mais avisos não lidos no período (para a escola procurar a família). */
export async function responsaveisComPendencias(params, limite) {
  const { rows } = await pool.query(
    `SELECT u.id, u.nome, u.email,
            COUNT(*)::int AS recebidos,
            COUNT(*) FILTER (WHERE d.visualizado_em IS NULL)::int AS nao_lidos
     FROM aviso_destinatarios d
     JOIN avisos av ON av.id = d.aviso_id
     JOIN usuarios u ON u.id = d.usuario_id
     WHERE ${FILTRO_AVISOS}
     GROUP BY u.id
     HAVING COUNT(*) FILTER (WHERE d.visualizado_em IS NULL) > 0
     ORDER BY nao_lidos DESC, u.nome ASC, u.id ASC
     LIMIT $4`,
    [...params, limite],
  );
  return rows;
}

// ---------- Ocorrências ----------

const FILTRO_OCORRENCIAS = `o.ativo
  AND o.data_ocorrencia BETWEEN $1::date AND $2::date
  AND ($3::uuid IS NULL OR o.autor_id = $3::uuid)`;

// Turma do aluno NO ANO da ocorrência (a matrícula ativa, ou a mais recente se ele foi transferido).
const TURMA_NO_ANO = `
  LEFT JOIN LATERAL (
    SELECT t.id, t.nome
    FROM aluno_turma atm
    JOIN turmas t ON t.id = atm.turma_id
    WHERE atm.aluno_id = o.aluno_id AND atm.ano_letivo = EXTRACT(YEAR FROM o.data_ocorrencia)::int
    ORDER BY atm.ativo DESC, atm.criado_em DESC
    LIMIT 1
  ) tu ON TRUE`;

export async function resumoOcorrencias(params) {
  const { rows } = await pool.query(
    `SELECT COUNT(DISTINCT o.id)::int AS ocorrencias,
            COUNT(DISTINCT o.aluno_id)::int AS alunos,
            COUNT(c.usuario_id)::int AS responsaveis,
            COUNT(c.ciente_em)::int AS cientes
     FROM ocorrencias o
     LEFT JOIN ocorrencia_ciencias c ON c.ocorrencia_id = o.id
     WHERE ${FILTRO_OCORRENCIAS}`,
    params,
  );
  return rows[0];
}

export async function ocorrenciasPorTipo(params) {
  const { rows } = await pool.query(
    `SELECT o.tipo, COUNT(*)::int AS total
     FROM ocorrencias o
     WHERE ${FILTRO_OCORRENCIAS}
     GROUP BY o.tipo
     ORDER BY total DESC, o.tipo ASC`,
    params,
  );
  return rows;
}

export async function ocorrenciasPorTurma(params) {
  const { rows } = await pool.query(
    `SELECT tu.id, tu.nome, COUNT(*)::int AS total, COUNT(DISTINCT o.aluno_id)::int AS alunos
     FROM ocorrencias o
     ${TURMA_NO_ANO}
     WHERE ${FILTRO_OCORRENCIAS}
     GROUP BY tu.id, tu.nome
     ORDER BY total DESC, tu.nome ASC NULLS LAST`,
    params,
  );
  return rows;
}

/** Alunos com mais ocorrências no período, com os tipos e a turma atual. */
export async function alunosComMaisOcorrencias(params, limite) {
  const { rows } = await pool.query(
    `SELECT a.id, a.nome, a.matricula,
            COUNT(*)::int AS total,
            MAX(o.data_ocorrencia) AS ultima,
            ARRAY_AGG(DISTINCT o.tipo ORDER BY o.tipo) AS tipos,
            (SELECT t.nome FROM aluno_turma atm JOIN turmas t ON t.id = atm.turma_id
             WHERE atm.aluno_id = a.id AND atm.ativo
             ORDER BY atm.ano_letivo DESC LIMIT 1) AS turma_atual
     FROM ocorrencias o
     JOIN alunos a ON a.id = o.aluno_id
     WHERE ${FILTRO_OCORRENCIAS}
     GROUP BY a.id
     ORDER BY total DESC, a.nome ASC, a.id ASC
     LIMIT $4`,
    [...params, limite],
  );
  return rows;
}

// ---------- Notas ----------

/** Disciplinas lecionadas na turma (com `professorId`, só as dele). */
export async function disciplinasDaTurma(turmaId, professorId = null) {
  const { rows } = await pool.query(
    `SELECT DISTINCT d.id, d.nome
     FROM professor_turma pt
     JOIN disciplinas d ON d.id = pt.disciplina_id
     WHERE pt.turma_id = $1 AND ($2::uuid IS NULL OR pt.professor_id = $2::uuid)
     ORDER BY d.nome ASC`,
    [turmaId, professorId],
  );
  return rows;
}

export async function alunosAtivosDaTurma(turmaId) {
  const { rows } = await pool.query(
    `SELECT a.id, a.nome, a.matricula
     FROM aluno_turma atm
     JOIN alunos a ON a.id = atm.aluno_id
     WHERE atm.turma_id = $1 AND atm.ativo
     ORDER BY a.nome ASC, a.id ASC`,
    [turmaId],
  );
  return rows;
}

/** Notas dos alunos com matrícula ativa, nas disciplinas informadas. */
export async function notasDaTurma(turmaId, disciplinaIds) {
  const { rows } = await pool.query(
    `SELECT n.aluno_id, n.disciplina_id, n.bimestre, n.valor
     FROM notas n
     JOIN aluno_turma atm ON atm.aluno_id = n.aluno_id AND atm.turma_id = n.turma_id AND atm.ativo
     WHERE n.turma_id = $1 AND n.disciplina_id = ANY($2::uuid[])`,
    [turmaId, disciplinaIds],
  );
  return rows;
}
