import * as conversaService from '../services/conversaService.js';

export async function list(req, res) {
  const data = await conversaService.listConversas(req.user, req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function contatos(req, res) {
  const data = await conversaService.getContatos(req.user, req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function getById(req, res) {
  const conversa = await conversaService.getConversa(req.user, req.params.id);
  res.status(200).json({ success: true, data: { conversa } });
}

export async function create(req, res) {
  const conversa = await conversaService.iniciarConversa(req.user, req.body);
  res.status(201).json({ success: true, message: 'Conversa iniciada.', data: { conversa } });
}

export async function enviar(req, res) {
  const conversa = await conversaService.enviarMensagem(req.user, req.params.id, req.body);
  res.status(201).json({ success: true, message: 'Mensagem enviada.', data: { conversa } });
}

export async function marcarLida(req, res) {
  const data = await conversaService.marcarLida(req.user, req.params.id);
  res.status(200).json({ success: true, data });
}
