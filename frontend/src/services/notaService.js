import { api } from './api';

/** Turmas (com disciplinas) em que o usuário pode lançar notas. */
export async function listTurmasNotas({ signal } = {}) {
  const { data } = await api.get('/notas/turmas', { signal });
  return data.data.turmas;
}

/** Grade da turma + disciplina: { turma, disciplina, alunos: [{ aluno, notas: {1..4}, media }] } */
export async function getGrade({ turmaId, disciplinaId }, { signal } = {}) {
  const { data } = await api.get(`/notas/turmas/${turmaId}/disciplinas/${disciplinaId}`, { signal });
  return data.data.grade;
}

/** notas: [{ alunoId, bimestre, valor (número ou null para apagar) }] → { grade, message } */
export async function lancarNotas({ turmaId, disciplinaId }, notas) {
  const { data } = await api.put(`/notas/turmas/${turmaId}/disciplinas/${disciplinaId}`, { notas });
  return { grade: data.data.grade, message: data.message };
}

/** Responsável: boletim de cada aluno vinculado. */
export async function getBoletim({ signal } = {}) {
  const { data } = await api.get('/me/boletim', { signal });
  return data.data.boletins;
}
