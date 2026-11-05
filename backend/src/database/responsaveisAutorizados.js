/**
 * SQL (subconsulta) dos responsáveis que podem receber comunicações sobre alunos:
 * usuários ATIVOS, com vínculo AUTORIZADO a receber comunicações, de alunos ATIVOS.
 * É a regra única usada por avisos e ocorrências (ver PROGRESSO.md, decisão 52).
 *
 * `alunoCondition` é um trecho SQL FIXO (escrito no código, nunca vindo do usuário)
 * sobre o alias `a` (alunos), com placeholders dos parâmetros da query que o usa.
 * Ex.: "a.id = $2::uuid"
 */
export function responsaveisAutorizadosSql(alunoCondition) {
  return `
    SELECT DISTINCT r.usuario_id
    FROM aluno_responsavel ar
    JOIN responsaveis r ON r.id = ar.responsavel_id
    JOIN usuarios u ON u.id = r.usuario_id AND u.ativo
    JOIN alunos a ON a.id = ar.aluno_id AND a.ativo
    WHERE ar.autorizado_receber_comunicacoes
      AND (${alunoCondition})`;
}
