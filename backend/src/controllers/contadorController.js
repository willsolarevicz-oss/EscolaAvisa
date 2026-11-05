import * as contadorService from '../services/contadorService.js';

export async function contadores(req, res) {
  const data = await contadorService.getContadores(req.user);
  res.status(200).json({ success: true, data });
}
