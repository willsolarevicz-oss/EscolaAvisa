import * as relatorioService from '../services/relatorioService.js';

export async function avisos(req, res) {
  const data = await relatorioService.relatorioAvisos(req.user, req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function ocorrencias(req, res) {
  const data = await relatorioService.relatorioOcorrencias(req.user, req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function notas(req, res) {
  const data = await relatorioService.relatorioNotas(req.user, req.validatedQuery);
  res.status(200).json({ success: true, data });
}
