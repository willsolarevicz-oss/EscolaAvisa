import * as auditoriaService from '../services/auditoriaService.js';

export async function list(req, res) {
  const data = await auditoriaService.listAuditoria(req.validatedQuery);
  res.status(200).json({ success: true, data });
}
