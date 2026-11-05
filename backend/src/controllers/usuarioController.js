import * as usuarioService from '../services/usuarioService.js';

export async function list(req, res) {
  const data = await usuarioService.listUsuarios(req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function getById(req, res) {
  const user = await usuarioService.getUsuario(req.params.id);
  res.status(200).json({ success: true, data: { user } });
}

export async function create(req, res) {
  const user = await usuarioService.createUsuario(req.body);
  res.status(201).json({ success: true, message: 'Usuário criado com sucesso.', data: { user } });
}

export async function update(req, res) {
  const user = await usuarioService.updateUsuario(req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Usuário atualizado com sucesso.', data: { user } });
}

export async function setAtivo(req, res) {
  const user = await usuarioService.setUsuarioAtivo(req.params.id, req.body.ativo, req.user);
  const message = user.ativo ? 'Usuário ativado com sucesso.' : 'Usuário desativado com sucesso.';
  res.status(200).json({ success: true, message, data: { user } });
}

export async function resetSenha(req, res) {
  await usuarioService.resetSenha(req.params.id, req.body.senha);
  res.status(200).json({ success: true, message: 'Senha redefinida com sucesso.' });
}
