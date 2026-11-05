import { pool } from '../database/pool.js';
import { responsaveisAutorizadosSql } from '../database/responsaveisAutorizados.js';

/**
 * Quem enxerga quais conversas (trechos SQL FIXOS; $1 = id do usuário logado):
 * - RESPONSAVEL: as dele;
 * - PROFESSOR  : canal PROFESSOR em que ele é o professor;
 * - SECRETARIA : (ADMIN) todas do canal SECRETARIA. Conversas de professor são privadas.
 */
const VISAO_SQL = {
  RESPONSAVEL: 'c.responsavel_usuario_id = $1',
  PROFESSOR: "c.canal = 'PROFESSOR' AND c.professor_usuario_id = $1",
  SECRETARIA: "c.canal = 'SECRETARIA' AND $1::uuid IS NOT NULL",
};

/** Mensagens do OUTRO lado enviadas depois da última leitura do meu lado. */
const NAO_LIDAS_SQL = {
  RESPONSAVEL: `(SELECT COUNT(*)::int FROM mensagens m
                 WHERE m.conversa_id = c.id AND m.autor_id <> c.responsavel_usuario_id
                   AND m.enviada_em > COALESCE(c.lida_responsavel_em, '-infinity'::timestamptz))`,
  ESCOLA: `(SELECT COUNT(*)::int FROM mensagens m
            WHERE m.conversa_id = c.id AND m.autor_id = c.responsavel_usuario_id
              AND m.enviada_em > COALESCE(c.lida_escola_em, '-infinity'::timestamptz))`,
};

/** Até quando o outro lado leu (para mostrar "lida" nas minhas mensagens). */
const LIDA_OUTRO_LADO_SQL = { RESPONSAVEL: 'c.lida_escola_em', ESCOLA: 'c.lida_responsavel_em' };

function selectConversa(lado) {
  return `
    SELECT c.id, c.assunto, c.canal, c.ultima_mensagem_em, c.criado_em, c.iniciada_por,
           c.aluno_id, al.nome AS aluno_nome,
           c.responsavel_usuario_id, ur.nome AS responsavel_nome,
           c.professor_usuario_id, up.nome AS professor_nome,
           ${NAO_LIDAS_SQL[lado]} AS nao_lidas,
           ${LIDA_OUTRO_LADO_SQL[lado]} AS lida_outro_lado_em,
           ult.conteudo AS ultima_conteudo, ult.autor_nome AS ultima_autor_nome
    FROM conversas c
    JOIN alunos al ON al.id = c.aluno_id
    JOIN usuarios ur ON ur.id = c.responsavel_usuario_id
    LEFT JOIN usuarios up ON up.id = c.professor_usuario_id
    LEFT JOIN LATERAL (
      SELECT LEFT(m.conteudo, 140) AS conteudo, ua.nome AS autor_nome
      FROM mensagens m JOIN usuarios ua ON ua.id = m.autor_id
      WHERE m.conversa_id = c.id
      ORDER BY m.enviada_em DESC, m.id DESC
      LIMIT 1
    ) ult ON TRUE`;
}

/** Conversas visíveis ao usuário, mais recentes primeiro. `naoLidas` filtra as com pendência. */
export async function list({ visao, lado, usuarioId, page, pageSize, naoLidas }) {
  const naoLidasSql = naoLidas ? `AND ${NAO_LIDAS_SQL[lado]} > 0` : '';
  const where = `WHERE ${VISAO_SQL[visao]} ${naoLidasSql}`;
  const [countResult, pageResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM conversas c ${where}`, [usuarioId]),
    pool.query(
      `${selectConversa(lado)} ${where}
       ORDER BY c.ultima_mensagem_em DESC, c.id ASC
       LIMIT $2 OFFSET $3`,
      [usuarioId, pageSize, (page - 1) * pageSize],
    ),
  ]);
  return { rows: pageResult.rows, total: countResult.rows[0].total };
}

/** A conversa, se o usuário puder vê-la (senão null). */
export async function findVisivel({ id, visao, lado, usuarioId }, db = pool) {
  const { rows } = await db.query(`${selectConversa(lado)} WHERE c.id = $2 AND ${VISAO_SQL[visao]}`, [usuarioId, id]);
  return rows[0] ?? null;
}

export async function listMensagens(conversaId) {
  const { rows } = await pool.query(
    `SELECT m.id, m.conteudo, m.enviada_em, m.autor_id, u.nome AS autor_nome,
            (m.autor_id = c.responsavel_usuario_id) AS do_responsavel
     FROM mensagens m
     JOIN conversas c ON c.id = m.conversa_id
     JOIN usuarios u ON u.id = m.autor_id
     WHERE m.conversa_id = $1
     ORDER BY m.enviada_em ASC, m.id ASC`,
    [conversaId],
  );
  return rows;
}

export async function create({ alunoId, responsavelUsuarioId, canal, professorUsuarioId, assunto, iniciadaPor }, db) {
  const { rows } = await db.query(
    `INSERT INTO conversas (aluno_id, responsavel_usuario_id, canal, professor_usuario_id, assunto, iniciada_por)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [alunoId, responsavelUsuarioId, canal, professorUsuarioId, assunto, iniciadaPor],
  );
  return rows[0].id;
}

const LIDA_COLUNA = { RESPONSAVEL: 'lida_responsavel_em', ESCOLA: 'lida_escola_em' };

/**
 * Grava a mensagem e atualiza a conversa: ela sobe na lista e, para quem enviou,
 * tudo até aqui conta como lido.
 */
export async function insertMensagem({ conversaId, autorId, conteudo, lado }, db) {
  const { rows } = await db.query(
    'INSERT INTO mensagens (conversa_id, autor_id, conteudo) VALUES ($1, $2, $3) RETURNING id, enviada_em',
    [conversaId, autorId, conteudo],
  );
  await db.query(
    `UPDATE conversas SET ultima_mensagem_em = $2, ${LIDA_COLUNA[lado]} = $2 WHERE id = $1`,
    [conversaId, rows[0].enviada_em],
  );
  return rows[0];
}

/** Marca como lido até a última mensagem existente (não "agora": evita perder uma que chegue junto). */
export async function marcarLida(conversaId, lado) {
  const coluna = LIDA_COLUNA[lado];
  await pool.query(
    `UPDATE conversas c
     SET ${coluna} = GREATEST(COALESCE(c.${coluna}, '-infinity'::timestamptz),
                              (SELECT MAX(m.enviada_em) FROM mensagens m WHERE m.conversa_id = c.id))
     WHERE c.id = $1`,
    [conversaId],
  );
}

// ---------- Regras de "quem fala com quem" ----------

/** O usuário é responsável AUTORIZADO (e ativo) deste aluno ATIVO? */
export async function isResponsavelAutorizado(usuarioId, alunoId) {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM (${responsaveisAutorizadosSql('a.id = $2::uuid')}) AS r WHERE r.usuario_id = $1 LIMIT 1`,
    [usuarioId, alunoId],
  );
  return rowCount > 0;
}

/** Alunos sobre os quais o responsável pode conversar (vínculo autorizado, aluno ativo). */
export async function listAlunosDoResponsavel(usuarioId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT a.id, a.nome
     FROM aluno_responsavel ar
     JOIN responsaveis r ON r.id = ar.responsavel_id AND r.usuario_id = $1
     JOIN alunos a ON a.id = ar.aluno_id AND a.ativo
     WHERE ar.autorizado_receber_comunicacoes
     ORDER BY a.nome ASC, a.id ASC`,
    [usuarioId],
  );
  return rows;
}

/** Professores ativos das turmas ativas em que cada aluno tem matrícula ativa. */
export async function listProfessoresDosAlunos(alunoIds) {
  if (alunoIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT atm.aluno_id, u.id, u.nome, ARRAY_AGG(DISTINCT d.nome ORDER BY d.nome) AS disciplinas
     FROM aluno_turma atm
     JOIN turmas t ON t.id = atm.turma_id AND t.ativo
     JOIN professor_turma pt ON pt.turma_id = t.id
     JOIN usuarios u ON u.id = pt.professor_id AND u.ativo
     JOIN disciplinas d ON d.id = pt.disciplina_id
     WHERE atm.ativo AND atm.aluno_id = ANY($1::uuid[])
     GROUP BY atm.aluno_id, u.id, u.nome
     ORDER BY u.nome ASC, u.id ASC`,
    [alunoIds],
  );
  return rows;
}

/** O professor (ativo) dá aula para o aluno (matrícula ativa em turma ativa dele)? */
export async function professorAtendeAluno(professorId, alunoId) {
  const { rowCount } = await pool.query(
    `SELECT 1
     FROM aluno_turma atm
     JOIN turmas t ON t.id = atm.turma_id AND t.ativo
     JOIN professor_turma pt ON pt.turma_id = t.id AND pt.professor_id = $1
     JOIN usuarios u ON u.id = pt.professor_id AND u.ativo
     WHERE atm.aluno_id = $2 AND atm.ativo
     LIMIT 1`,
    [professorId, alunoId],
  );
  return rowCount > 0;
}

/** Responsáveis autorizados (e ativos) do aluno, para a escola escolher com quem falar. */
export async function listResponsaveisDoAluno(alunoId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.nome, ar.parentesco, ar.responsavel_principal
     FROM aluno_responsavel ar
     JOIN responsaveis r ON r.id = ar.responsavel_id
     JOIN usuarios u ON u.id = r.usuario_id AND u.ativo
     JOIN alunos a ON a.id = ar.aluno_id AND a.ativo
     WHERE ar.aluno_id = $1 AND ar.autorizado_receber_comunicacoes
     ORDER BY ar.responsavel_principal DESC, u.nome ASC, u.id ASC`,
    [alunoId],
  );
  return rows;
}
