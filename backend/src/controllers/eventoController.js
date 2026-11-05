import * as eventoService from '../services/eventoService.js';

export async function calendario(req, res) {
  const data = await eventoService.getCalendario(req.user, req.validatedQuery.mes);
  res.status(200).json({ success: true, data });
}

export async function getById(req, res) {
  const evento = await eventoService.getEvento(req.user, req.params.id);
  res.status(200).json({ success: true, data: { evento } });
}

export async function create(req, res) {
  const evento = await eventoService.createEvento(req.user, req.body);
  res.status(201).json({ success: true, message: 'Evento criado.', data: { evento } });
}

export async function update(req, res) {
  const evento = await eventoService.updateEvento(req.user, req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Evento atualizado.', data: { evento } });
}

export async function remove(req, res) {
  await eventoService.deleteEvento(req.user, req.params.id);
  res.status(200).json({ success: true, message: 'Evento excluído.' });
}
