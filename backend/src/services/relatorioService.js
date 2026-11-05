import { ROLES } from '../config/roles.js';
import * as relatorioRepository from '../repositories/relatorioRepository.js';
import * as turmaRepository from '../repositories/turmaRepository.js';
import { AppError } from '../utils/AppError.js';
import { isUuid } from '../utils/uuid.js';
import { calcularMedia } from './notaService.js';

// Listas longas ficam úteis só no topo; o resumo sempre considera tudo.
const LIMITE_AVISOS = 100;
const LIMITE_RANKING = 10;

/** Professor só vê o que ele publicou/registrou; ADMIN, tudo. */
const autorFilter = (user) => (user.tipo_usuario === ROLES.PROFESSOR ? user.id : null);

/** Fração 0–1 com 3 casas (a tela formata como %). Sem base → null, não 0%. */
function taxa(parte, total) {
  return total > 0 ? Math.round((parte / total) * 1000) / 1000 : null;
}

const arredondar1 = (valor) => Math.round(valor * 10) / 10;

// ---------- Leitura de avisos ----------

export async function relatorioAvisos(user, { inicio, fim }) {
  const params = [inicio, fim, autorFilter(user)];
  const [resumo, avisos, porTurma, responsaveis] = await Promise.all([
    relatorioRepository.resumoAvisos(params),
    relatorioRepository.listAvisosComLeitura(params, LIMITE_AVISOS),
    relatorioRepository.leituraPorTurma(params),
    relatorioRepository.responsaveisComPendencias(params, LIMITE_RANKING),
  ]);

  return {
    periodo: { inicio, fim },
    resumo: { ...resumo, taxaLeitura: taxa(resumo.lidos, resumo.destinatarios) },
    avisos: avisos.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      publico: a.publico,
      turmaNome: a.turma_nome,
      alunoNome: a.aluno_nome,
      autorNome: a.autor_nome,
      publicadoEm: a.publicado_em,
      destinatarios: a.destinatarios,
      lidos: a.lidos,
      taxaLeitura: taxa(a.lidos, a.destinatarios),
    })),
    avisosTruncados: resumo.avisos > avisos.length,
    porTurma: porTurma.map((t) => ({
      turma: { id: t.id, nome: t.nome, anoLetivo: t.ano_letivo },
      avisos: t.avisos,
      destinatarios: t.destinatarios,
      lidos: t.lidos,
      taxaLeitura: taxa(t.lidos, t.destinatarios),
    })),
    responsaveisComPendencias: responsaveis.map((r) => ({
      usuario: { id: r.id, nome: r.nome, email: r.email },
      recebidos: r.recebidos,
      naoLidos: r.nao_lidos,
    })),
  };
}

// ---------- Ocorrências ----------

export async function relatorioOcorrencias(user, { inicio, fim }) {
  const params = [inicio, fim, autorFilter(user)];
  const [resumo, porTipo, porTurma, alunos] = await Promise.all([
    relatorioRepository.resumoOcorrencias(params),
    relatorioRepository.ocorrenciasPorTipo(params),
    relatorioRepository.ocorrenciasPorTurma(params),
    relatorioRepository.alunosComMaisOcorrencias(params, LIMITE_RANKING),
  ]);

  return {
    periodo: { inicio, fim },
    resumo: {
      ocorrencias: resumo.ocorrencias,
      alunos: resumo.alunos,
      responsaveis: resumo.responsaveis,
      cientes: resumo.cientes,
      taxaCiencia: taxa(resumo.cientes, resumo.responsaveis),
    },
    porTipo: porTipo.map((t) => ({ tipo: t.tipo, total: t.total })),
    // Turma null = aluno sem matrícula naquele ano letivo.
    porTurma: porTurma.map((t) => ({ turma: t.id ? { id: t.id, nome: t.nome } : null, total: t.total, alunos: t.alunos })),
    alunos: alunos.map((a) => ({
      aluno: { id: a.id, nome: a.nome, matricula: a.matricula },
      turmaAtual: a.turma_atual,
      total: a.total,
      tipos: a.tipos,
      ultima: a.ultima,
    })),
  };
}

// ---------- Notas ----------

/**
 * Por disciplina: média da turma em cada bimestre (das notas lançadas), média final de
 * cada aluno (mesma regra do boletim) e quem ficou abaixo da nota de corte.
 */
export async function relatorioNotas(user, { turmaId, notaCorte }) {
  const turma = isUuid(turmaId) ? await turmaRepository.findById(turmaId) : null;
  if (!turma) throw AppError.notFound('Turma não encontrada.');

  const professorId = user.tipo_usuario === ROLES.PROFESSOR ? user.id : null;
  const disciplinas = await relatorioRepository.disciplinasDaTurma(turmaId, professorId);
  if (professorId && disciplinas.length === 0) {
    throw AppError.forbidden('Você só pode ver relatórios das turmas em que leciona.');
  }

  const [alunos, notas] = await Promise.all([
    relatorioRepository.alunosAtivosDaTurma(turmaId),
    relatorioRepository.notasDaTurma(
      turmaId,
      disciplinas.map((d) => d.id),
    ),
  ]);

  // notas[disciplina][aluno][bimestre] = valor (NUMERIC chega como string).
  const porDisciplina = new Map(disciplinas.map((d) => [d.id, new Map()]));
  for (const n of notas) {
    const porAluno = porDisciplina.get(n.disciplina_id);
    if (!porAluno.has(n.aluno_id)) porAluno.set(n.aluno_id, { 1: null, 2: null, 3: null, 4: null });
    porAluno.get(n.aluno_id)[n.bimestre] = Number(n.valor);
  }

  return {
    turma: { id: turma.id, nome: turma.nome, anoLetivo: turma.ano_letivo, turno: turma.turno },
    notaCorte,
    totalAlunos: alunos.length,
    disciplinas: disciplinas.map((d) => {
      const porAluno = porDisciplina.get(d.id);

      const bimestres = {};
      for (const b of [1, 2, 3, 4]) {
        const valores = [...porAluno.values()].map((notasAluno) => notasAluno[b]).filter((v) => v !== null);
        bimestres[b] = {
          lancadas: valores.length,
          media: valores.length ? arredondar1(valores.reduce((s, v) => s + v, 0) / valores.length) : null,
        };
      }

      const medias = alunos
        .map((a) => ({ aluno: a, media: porAluno.has(a.id) ? calcularMedia(porAluno.get(a.id)) : null }))
        .filter((m) => m.media !== null);

      return {
        disciplina: { id: d.id, nome: d.nome },
        bimestres,
        alunosComNota: medias.length,
        mediaTurma: medias.length ? arredondar1(medias.reduce((s, m) => s + m.media, 0) / medias.length) : null,
        abaixoDoCorte: medias
          .filter((m) => m.media < notaCorte)
          .sort((x, y) => x.media - y.media || x.aluno.nome.localeCompare(y.aluno.nome))
          .map((m) => ({ id: m.aluno.id, nome: m.aluno.nome, matricula: m.aluno.matricula, media: m.media })),
      };
    }),
  };
}
