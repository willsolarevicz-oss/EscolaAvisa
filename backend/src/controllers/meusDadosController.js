import * as meusDadosService from '../services/meusDadosService.js';

/** GET /api/me/dados — cópia dos próprios dados (LGPD art. 18). */
export async function exportar(req, res) {
  const data = await meusDadosService.exportarMeusDados(req.user);
  // Dados pessoais: o navegador e proxies não devem guardar cópia.
  res.set('Cache-Control', 'no-store');
  res.status(200).json({ success: true, data });
}
