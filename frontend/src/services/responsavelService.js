import { api } from './api';

/** params: { page, pageSize, busca, ativo, semAluno } → { items: [{ usuario, telefone, alunos }], pagination } */
export async function listResponsaveis(params, { signal } = {}) {
  const { data } = await api.get('/responsaveis', { params, signal });
  return data.data;
}

/** Alunos ativos sem responsável que receba comunicações: { total, alunos: [{ id, nome, matricula, turmaAtual, totalVinculos }] } */
export async function getPendenciasResponsaveis({ signal } = {}) {
  const { data } = await api.get('/responsaveis/pendencias', { signal });
  return data.data;
}
