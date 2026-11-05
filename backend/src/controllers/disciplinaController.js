import * as disciplinaService from '../services/disciplinaService.js';

export async function list(req, res) {
  const data = await disciplinaService.listDisciplinas(req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function getById(req, res) {
  const disciplina = await disciplinaService.getDisciplina(req.params.id);
  res.status(200).json({ success: true, data: { disciplina } });
}

export async function create(req, res) {
  const disciplina = await disciplinaService.createDisciplina(req.body);
  res.status(201).json({ success: true, message: 'Disciplina cadastrada com sucesso.', data: { disciplina } });
}

export async function update(req, res) {
  const disciplina = await disciplinaService.updateDisciplina(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Disciplina atualizada com sucesso.', data: { disciplina } });
}

export async function setAtivo(req, res) {
  const disciplina = await disciplinaService.setDisciplinaAtivo(req.params.id, req.body.ativo);
  const message = disciplina.ativo ? 'Disciplina reativada com sucesso.' : 'Disciplina desativada com sucesso.';
  res.status(200).json({ success: true, message, data: { disciplina } });
}
