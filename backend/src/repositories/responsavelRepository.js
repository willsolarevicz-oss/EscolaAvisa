import { pool } from '../database/pool.js';
import { buscaSemAcento, containsPattern } from '../database/sqlHelpers.js';

const COLUMNS = 'id, usuario_id, telefone, cpf, criado_em, atualizado_em';

export async function findByUsuarioId(usuarioId, db = pool) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM responsaveis WHERE usuario_id = $1`, [
    usuarioId,
  ]);
  return rows[0] ?? null;
}

/**
 * Garante que o usuário tenha o registro em `responsaveis` (sem alterar dados existentes)
 * e devolve o id dele. Usado ao vincular um responsável a um aluno.
 */
export async function ensureForUsuario(usuarioId, db = pool) {
  await db.query(
    'INSERT INTO responsaveis (usuario_id) VALUES ($1) ON CONFLICT (usuario_id) DO NOTHING',
    [usuarioId],
  );
  return (await findByUsuarioId(usuarioId, db)).id;
}

/**
 * Cria ou atualiza os dados de responsável de um usuário.
 * Upsert porque usuários RESPONSAVEL criados fora da API (ex.: SQL manual) podem não ter o registro.
 */
export async function upsertByUsuarioId(usuarioId, { telefone, cpf }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO responsaveis (usuario_id, telefone, cpf)
     VALUES ($1, $2, $3)
     ON CONFLICT (usuario_id) DO UPDATE SET telefone = EXCLUDED.telefone, cpf = EXCLUDED.cpf
     RETURNING ${COLUMNS}`,
    [usuarioId, telefone, cpf],
  );
  return rows[0];
}

// ---------- Tela de Responsáveis (ADMIN) ----------

/**
 * Responsáveis = usuários com perfil RESPONSAVEL (o registro em `responsaveis` pode ainda não
 * existir se nunca foi vinculado nem teve telefone/CPF). Cada um vem com seus alunos.
 * Filtros: busca (nome/e-mail, sem acento), ativo, semAluno (sem nenhum vínculo).
 */
export async function listComAlunos({ page, pageSize, busca, ativo, semAluno }) {
  const conditions = ["u.tipo_usuario = 'RESPONSAVEL'"];
  const params = [];
  if (busca) {
    params.push(containsPattern(busca));
    conditions.push(buscaSemAcento(['u.nome', 'u.email'], `$${params.length}`));
  }
  if (ativo !== undefined) {
    params.push(ativo);
    conditions.push(`u.ativo = $${params.length}`);
  }
  if (semAluno) {
    conditions.push('NOT EXISTS (SELECT 1 FROM aluno_responsavel ar WHERE ar.responsavel_id = r.id)');
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const from = 'FROM usuarios u LEFT JOIN responsaveis r ON r.usuario_id = u.id';

  const [countResult, pageResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total ${from} ${where}`, params),
    pool.query(
      `SELECT u.id, u.nome, u.email, u.ativo, r.telefone,
              COALESCE(al.alunos, '[]'::json) AS alunos
       ${from}
       LEFT JOIN LATERAL (
         SELECT JSON_AGG(JSON_BUILD_OBJECT(
                  'id', a.id, 'nome', a.nome, 'matricula', a.matricula, 'ativo', a.ativo,
                  'parentesco', ar.parentesco, 'principal', ar.responsavel_principal,
                  'autorizado', ar.autorizado_receber_comunicacoes)
                ORDER BY a.nome) AS alunos
         FROM aluno_responsavel ar
         JOIN alunos a ON a.id = ar.aluno_id
         WHERE ar.responsavel_id = r.id
       ) al ON TRUE
       ${where}
       ORDER BY u.nome ASC, u.id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pageSize, (page - 1) * pageSize],
    ),
  ]);
  return { rows: pageResult.rows, total: countResult.rows[0].total };
}

/**
 * Alunos ATIVOS sem nenhum responsável que receba comunicações (vínculo autorizado de
 * usuário ativo): a família não recebe avisos, ocorrências nem boletim.
 */
export async function alunosSemResponsavelAutorizado(limite) {
  const condicao = `a.ativo AND NOT EXISTS (
      SELECT 1 FROM aluno_responsavel ar
      JOIN responsaveis r ON r.id = ar.responsavel_id
      JOIN usuarios u ON u.id = r.usuario_id AND u.ativo
      WHERE ar.aluno_id = a.id AND ar.autorizado_receber_comunicacoes)`;
  const [countResult, rowsResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM alunos a WHERE ${condicao}`),
    pool.query(
      `SELECT a.id, a.nome, a.matricula,
              (SELECT COUNT(*)::int FROM aluno_responsavel ar WHERE ar.aluno_id = a.id) AS total_vinculos,
              (SELECT t.nome FROM aluno_turma atm JOIN turmas t ON t.id = atm.turma_id
               WHERE atm.aluno_id = a.id AND atm.ativo
               ORDER BY atm.ano_letivo DESC LIMIT 1) AS turma_atual
       FROM alunos a
       WHERE ${condicao}
       ORDER BY a.nome ASC, a.id ASC
       LIMIT $1`,
      [limite],
    ),
  ]);
  return { rows: rowsResult.rows, total: countResult.rows[0].total };
}
