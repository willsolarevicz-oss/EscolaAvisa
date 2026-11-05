import * as turmaService from '../services/turmaService.js';

export async function list(req, res) {
  const data = await turmaService.listTurmas(req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function getById(req, res) {
  const turma = await turmaService.getTurma(req.params.id);
  res.status(200).json({ success: true, data: { turma } });
}

export async function create(req, res) {
  const turma = await turmaService.createTurma(req.body);
  res.status(201).json({ success: true, message: 'Turma cadastrada com sucesso.', data: { turma } });
}

export async function update(req, res) {
  const turma = await turmaService.updateTurma(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Turma atualizada com sucesso.', data: { turma } });
}

export async function setAtivo(req, res) {
  const turma = await turmaService.setTurmaAtivo(req.params.id, req.body.ativo);
  const message = turma.ativo ? 'Turma reativada com sucesso.' : 'Turma desativada com sucesso.';
  res.status(200).json({ success: true, message, data: { turma } });
}

export async function listAlunos(req, res) {
  const alunos = await turmaService.listAlunos(req.params.id);
  res.status(200).json({ success: true, data: { alunos } });
}

export async function matricularAluno(req, res) {
  const data = await turmaService.matricularAluno(req.params.id, req.body);
  const message = data.transferidoDe
    ? `Aluno transferido da turma ${data.transferidoDe.nome}.`
    : 'Aluno matriculado com sucesso.';
  res.status(201).json({ success: true, message, data });
}

export async function removerAluno(req, res) {
  await turmaService.removerAluno(req.params.id, req.params.alunoId);
  res.status(200).json({ success: true, message: 'Matrícula encerrada. O histórico foi mantido.' });
}

export async function listProfessores(req, res) {
  const professores = await turmaService.listProfessores(req.params.id);
  res.status(200).json({ success: true, data: { professores } });
}

export async function atribuirProfessor(req, res) {
  const atribuicao = await turmaService.atribuirProfessor(req.params.id, req.body);
  res.status(201).json({ success: true, message: 'Professor atribuído com sucesso.', data: { atribuicao } });
}

export async function removerAtribuicao(req, res) {
  await turmaService.removerAtribuicao(req.params.id, req.params.atribuicaoId);
  res.status(200).json({ success: true, message: 'Atribuição removida com sucesso.' });
}
