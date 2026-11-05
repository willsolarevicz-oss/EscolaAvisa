import { api } from './api';

/** params: { inicio?, fim? } (AAAA-MM-DD; padrão: 1º de janeiro até hoje) */
export async function getRelatorioAvisos(params, { signal } = {}) {
  const { data } = await api.get('/relatorios/avisos', { params, signal });
  return data.data;
}

/** params: { inicio?, fim? } */
export async function getRelatorioOcorrencias(params, { signal } = {}) {
  const { data } = await api.get('/relatorios/ocorrencias', { params, signal });
  return data.data;
}

/** params: { turmaId, notaCorte? } (nota de corte padrão: 6) */
export async function getRelatorioNotas(params, { signal } = {}) {
  const { data } = await api.get('/relatorios/notas', { params, signal });
  return data.data;
}
