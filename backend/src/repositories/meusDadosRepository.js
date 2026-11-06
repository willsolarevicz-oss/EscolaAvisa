import { pool } from '../database/pool.js';

/*
 * Consultas do "Meus dados" (LGPD art. 18: acesso e portabilidade). Todas filtram pelo id do
 * próprio usuário logado ($1); nada aqui recebe id vindo da URL.
 */

export async function responsavel(usuarioId) {
  const { rows } = await pool.query('SELECT telefone, cpf FROM responsaveis WHERE usuario_id = $1', [usuarioId]);
  return rows[0] ?? null;
}

export async function alunosVinculados(usuarioId) {
  const { rows } = await pool.query(
    `SELECT a.nome, a.matricula, a.data_nascimento, ar.parentesco,
            ar.responsavel_principal, ar.autorizado_receber_comunicacoes
     FROM aluno_responsavel ar
     JOIN responsaveis r ON r.id = ar.responsavel_id AND r.usuario_id = $1
     JOIN alunos a ON a.id = ar.aluno_id
     ORDER BY a.nome`,
    [usuarioId],
  );
  return rows;
}

export async function avisosRecebidos(usuarioId) {
  const { rows } = await pool.query(
    `SELECT av.titulo, av.publicado_em, d.visualizado_em
     FROM aviso_destinatarios d JOIN avisos av ON av.id = d.aviso_id
     WHERE d.usuario_id = $1
     ORDER BY av.publicado_em DESC`,
    [usuarioId],
  );
  return rows;
}

export async function ocorrenciasComCiencia(usuarioId) {
  const { rows } = await pool.query(
    `SELECT al.nome AS aluno_nome, o.tipo, o.data_ocorrencia, o.descricao, c.ciente_em
     FROM ocorrencia_ciencias c
     JOIN ocorrencias o ON o.id = c.ocorrencia_id
     JOIN alunos al ON al.id = o.aluno_id
     WHERE c.usuario_id = $1
     ORDER BY o.data_ocorrencia DESC`,
    [usuarioId],
  );
  return rows;
}

/** Mensagens que a própria pessoa escreveu (com o assunto da conversa). */
export async function mensagensEnviadas(usuarioId) {
  const { rows } = await pool.query(
    `SELECT c.assunto, m.conteudo, m.enviada_em
     FROM mensagens m JOIN conversas c ON c.id = m.conversa_id
     WHERE m.autor_id = $1
     ORDER BY m.enviada_em DESC`,
    [usuarioId],
  );
  return rows;
}

/** Últimas ações registradas na auditoria (inclui o IP, que também é dado pessoal). */
export async function acoesRegistradas(usuarioId, limite) {
  const { rows } = await pool.query(
    `SELECT metodo, rota, status, ip, criado_em
     FROM auditoria WHERE usuario_id = $1
     ORDER BY criado_em DESC LIMIT $2`,
    [usuarioId, limite],
  );
  return rows;
}
