/**
 * Aluno enviado por outra tela via `navigate(url, { state: { aluno } })` (ex.: "Minhas turmas"
 * abrindo "Registrar ocorrência" já com o aluno escolhido). Só aceita o formato esperado;
 * o backend continua validando se o usuário pode agir sobre esse aluno.
 */
export function alunoDaNavegacao(state) {
  const aluno = state?.aluno;
  const valido =
    aluno && typeof aluno.id === 'string' && typeof aluno.nome === 'string' && typeof aluno.matricula === 'string';
  return valido ? { id: aluno.id, nome: aluno.nome, matricula: aluno.matricula } : null;
}
