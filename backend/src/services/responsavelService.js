import * as responsavelRepository from '../repositories/responsavelRepository.js';
import { toPagination } from '../utils/pagination.js';

// O alerta mostra os primeiros; o total diz quantos são ao todo.
const LIMITE_PENDENCIAS = 50;

/** Tela de Responsáveis (ADMIN): só consulta; cadastro e vínculos ficam em Usuários e Alunos. */
export async function listResponsaveis({ page, pageSize, busca, ativo, semAluno }) {
  const { rows, total } = await responsavelRepository.listComAlunos({ page, pageSize, busca, ativo, semAluno });
  return {
    items: rows.map((r) => ({
      usuario: { id: r.id, nome: r.nome, email: r.email, ativo: r.ativo },
      telefone: r.telefone,
      // JSON_AGG já devolve objetos; só garantimos a forma da API.
      alunos: r.alunos.map((a) => ({
        id: a.id,
        nome: a.nome,
        matricula: a.matricula,
        ativo: a.ativo,
        parentesco: a.parentesco,
        principal: a.principal,
        autorizado: a.autorizado,
      })),
    })),
    pagination: toPagination({ page, pageSize, total }),
  };
}

/** Alunos ativos cuja família não recebe comunicações (nenhum responsável autorizado e ativo). */
export async function listAlunosSemResponsavelAutorizado() {
  const { rows, total } = await responsavelRepository.alunosSemResponsavelAutorizado(LIMITE_PENDENCIAS);
  return {
    total,
    alunos: rows.map((a) => ({
      id: a.id,
      nome: a.nome,
      matricula: a.matricula,
      turmaAtual: a.turma_atual,
      // > 0: tem vínculo, mas nenhum autorizado/ativo (ajuste na tela do aluno).
      totalVinculos: a.total_vinculos,
    })),
  };
}
