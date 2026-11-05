import * as ocorrenciaService from '../services/ocorrenciaService.js';

// ---------- Gestão (ADMIN e PROFESSOR) ----------

export async function list(req, res) {
  const data = await ocorrenciaService.listOcorrencias(req.user, req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function getById(req, res) {
  const ocorrencia = await ocorrenciaService.getOcorrencia(req.user, req.params.id);
  res.status(200).json({ success: true, data: { ocorrencia } });
}

export async function create(req, res) {
  const ocorrencia = await ocorrenciaService.createOcorrencia(req.user, req.body);
  const n = ocorrencia.totalResponsaveis;
  const message =
    n === 0
      ? 'Ocorrência registrada. O aluno não tem responsável autorizado para dar ciência.'
      : `Ocorrência registrada. ${n} ${n === 1 ? 'responsável deve' : 'responsáveis devem'} dar ciência.`;
  res.status(201).json({ success: true, message, data: { ocorrencia } });
}

export async function setAtivo(req, res) {
  const ocorrencia = await ocorrenciaService.setOcorrenciaAtivo(req.user, req.params.id, req.body.ativo);
  const message = ocorrencia.ativo ? 'Ocorrência reativada.' : 'Ocorrência arquivada.';
  res.status(200).json({ success: true, message, data: { ocorrencia } });
}

// ---------- /api/me ----------

export async function listMinhas(req, res) {
  const data = await ocorrenciaService.listMinhasOcorrencias(req.user, req.validatedQuery);
  res.status(200).json({ success: true, data });
}

export async function getMinha(req, res) {
  const ocorrencia = await ocorrenciaService.getMinhaOcorrencia(req.user, req.params.id);
  res.status(200).json({ success: true, data: { ocorrencia } });
}

export async function registrarCiencia(req, res) {
  const data = await ocorrenciaService.registrarCiencia(req.user, req.params.id);
  res.status(200).json({ success: true, data });
}

export async function meusAlunos(req, res) {
  const alunos = await ocorrenciaService.listMeusAlunos(req.user, req.validatedQuery);
  res.status(200).json({ success: true, data: { alunos } });
}
