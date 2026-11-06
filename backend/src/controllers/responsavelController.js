import * as responsavelService from '../services/responsavelService.js';

export async function list(req, res) {
  const data = await responsavelService.listResponsaveis(req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function pendencias(_req, res) {
  const data = await responsavelService.listAlunosSemResponsavelAutorizado();
  res.status(200).json({ success: true, data });
}
