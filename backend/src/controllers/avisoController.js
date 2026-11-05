import * as avisoService from '../services/avisoService.js';

// ---------- Gestão (ADMIN e PROFESSOR) ----------

export async function list(req, res) {
  const data = await avisoService.listAvisos(req.user, req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function getById(req, res) {
  const aviso = await avisoService.getAviso(req.user, req.params.id);
  res.status(200).json({ success: true, data: { aviso } });
}

export async function create(req, res) {
  const aviso = await avisoService.createAviso(req.user, req.body);
  const plural = aviso.totalDestinatarios === 1 ? 'responsável' : 'responsáveis';
  res.status(201).json({
    success: true,
    message: `Aviso publicado para ${aviso.totalDestinatarios} ${plural}.`,
    data: { aviso },
  });
}

export async function setAtivo(req, res) {
  const aviso = await avisoService.setAvisoAtivo(req.user, req.params.id, req.body.ativo);
  const message = aviso.ativo ? 'Aviso reativado.' : 'Aviso arquivado. Os responsáveis não o veem mais.';
  res.status(200).json({ success: true, message, data: { aviso } });
}

// ---------- /api/me (usuário logado) ----------

export async function listMeus(req, res) {
  const data = await avisoService.listMeusAvisos(req.user, req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function getMeu(req, res) {
  const aviso = await avisoService.getMeuAviso(req.user, req.params.id);
  res.status(200).json({ success: true, data: { aviso } });
}

export async function marcarLido(req, res) {
  const data = await avisoService.marcarComoLido(req.user, req.params.id);
  res.status(200).json({ success: true, data });
}

export async function minhasTurmas(req, res) {
  const turmas = await avisoService.listMinhasTurmas(req.user);
  res.status(200).json({ success: true, data: { turmas } });
}
