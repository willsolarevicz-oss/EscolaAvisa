import * as notaService from '../services/notaService.js';

export async function listTurmas(req, res) {
  const turmas = await notaService.listTurmasParaLancamento(req.user);
  res.status(200).json({ success: true, data: { turmas } });
}

export async function getGrade(req, res) {
  const grade = await notaService.getGrade(req.user, req.params.turmaId, req.params.disciplinaId);
  res.status(200).json({ success: true, data: { grade } });
}

export async function lancar(req, res) {
  const grade = await notaService.lancarNotas(req.user, req.params.turmaId, req.params.disciplinaId, req.body);
  const n = req.body.notas.length;
  // "Alteração" porque o lote pode incluir remoções (valor null), não só notas novas.
  res.status(200).json({
    success: true,
    message: `${n} ${n === 1 ? 'alteração salva' : 'alterações salvas'}.`,
    data: { grade },
  });
}

export async function boletim(req, res) {
  const boletins = await notaService.getBoletim(req.user);
  res.status(200).json({ success: true, data: { boletins } });
}
