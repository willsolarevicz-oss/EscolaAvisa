import * as alunoService from '../services/alunoService.js';

export async function list(req, res) {
  const data = await alunoService.listAlunos(req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function getById(req, res) {
  const aluno = await alunoService.getAluno(req.params.id);
  res.status(200).json({ success: true, data: { aluno } });
}

export async function create(req, res) {
  const aluno = await alunoService.createAluno(req.body);
  res.status(201).json({ success: true, message: 'Aluno cadastrado com sucesso.', data: { aluno } });
}

export async function update(req, res) {
  const aluno = await alunoService.updateAluno(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Aluno atualizado com sucesso.', data: { aluno } });
}

export async function setAtivo(req, res) {
  const aluno = await alunoService.setAlunoAtivo(req.params.id, req.body.ativo);
  const message = aluno.ativo ? 'Aluno reativado com sucesso.' : 'Aluno desativado com sucesso.';
  res.status(200).json({ success: true, message, data: { aluno } });
}

export async function listVinculos(req, res) {
  const responsaveis = await alunoService.listVinculos(req.params.id);
  res.status(200).json({ success: true, data: { responsaveis } });
}

export async function createVinculo(req, res) {
  const vinculo = await alunoService.createVinculo(req.params.id, req.body);
  res.status(201).json({ success: true, message: 'Responsável vinculado com sucesso.', data: { vinculo } });
}

export async function updateVinculo(req, res) {
  const vinculo = await alunoService.updateVinculo(req.params.id, req.params.vinculoId, req.body);
  res.status(200).json({ success: true, message: 'Vínculo atualizado com sucesso.', data: { vinculo } });
}

export async function removeVinculo(req, res) {
  await alunoService.removeVinculo(req.params.id, req.params.vinculoId);
  res.status(200).json({ success: true, message: 'Vínculo removido com sucesso.' });
}
