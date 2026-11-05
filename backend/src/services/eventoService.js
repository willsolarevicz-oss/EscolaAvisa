import { ROLES } from '../config/roles.js';
import * as eventoRepository from '../repositories/eventoRepository.js';
import * as professorTurmaRepository from '../repositories/professorTurmaRepository.js';
import * as turmaRepository from '../repositories/turmaRepository.js';
import { AppError } from '../utils/AppError.js';
import { toEventoResponse } from '../utils/serializers.js';
import { isUuid } from '../utils/uuid.js';
import { getFeriadosDoAno } from './feriadoService.js';

const NOT_FOUND = 'Evento não encontrado.';

function invalidField(field, message) {
  return AppError.badRequest('Dados inválidos. Verifique os campos informados.', [{ field, message }]);
}

/** ADMIN edita qualquer evento; PROFESSOR só os que criou; RESPONSAVEL nenhum. */
function podeEditar(user, evento) {
  if (user.tipo_usuario === ROLES.ADMIN) return true;
  return user.tipo_usuario === ROLES.PROFESSOR && evento.autor_id === user.id;
}

function toResponse(user, evento) {
  return toEventoResponse(evento, podeEditar(user, evento));
}

async function findEditavelOrFail(user, id) {
  const evento = isUuid(id) ? await eventoRepository.findById(id) : null;
  // Evento de outro autor responde 404 para o professor (mesma regra de avisos/ocorrências).
  if (!evento || !podeEditar(user, evento)) throw AppError.notFound(NOT_FOUND);
  return evento;
}

/**
 * Professor: só para turmas em que leciona (evento da escola toda é do ADMIN).
 * `turmaAtualId` permite salvar a edição de um evento cuja turma foi desativada depois.
 */
async function validateTurma(user, turmaId, turmaAtualId = null) {
  if (user.tipo_usuario === ROLES.PROFESSOR) {
    if (!turmaId) throw invalidField('turmaId', 'Selecione uma das suas turmas.');
    if (!(await professorTurmaRepository.professorLecionaNaTurma(user.id, turmaId))) {
      throw AppError.forbidden('Você só pode criar eventos para turmas em que leciona.');
    }
  }
  if (!turmaId) return;

  const turma = await turmaRepository.findById(turmaId);
  if (!turma) throw invalidField('turmaId', 'Turma não encontrada.');
  if (!turma.ativo && turmaId !== turmaAtualId) throw invalidField('turmaId', 'Esta turma está desativada.');
}

// ---------- Calendário (todos os perfis) ----------

/** Primeiro e último dia do mês 'AAAA-MM' (o dia 0 do mês seguinte é o último deste). */
function limitesDoMes(mes) {
  const [ano, numeroMes] = mes.split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(ano, numeroMes, 0)).getUTCDate();
  return { ano, inicio: `${mes}-01`, fim: `${mes}-${String(ultimoDia).padStart(2, '0')}` };
}

function listEventosVisiveis(user, periodo) {
  if (user.tipo_usuario === ROLES.ADMIN) return eventoRepository.listNoPeriodo(periodo);
  if (user.tipo_usuario === ROLES.PROFESSOR) {
    return eventoRepository.listNoPeriodoParaProfessor({ ...periodo, professorId: user.id });
  }
  return eventoRepository.listNoPeriodoParaResponsavel({ ...periodo, usuarioId: user.id });
}

/**
 * Eventos visíveis ao usuário + feriados nacionais do mês.
 * Se a BrasilAPI falhar, `feriadosDisponiveis` vem false e o calendário segue com os eventos.
 */
export async function getCalendario(user, mes) {
  const { ano, inicio, fim } = limitesDoMes(mes);
  const [eventos, feriadosDoAno] = await Promise.all([
    listEventosVisiveis(user, { inicio, fim }),
    getFeriadosDoAno(ano),
  ]);

  return {
    mes,
    eventos: eventos.map((evento) => toResponse(user, evento)),
    feriados: (feriadosDoAno ?? []).filter((f) => f.data >= inicio && f.data <= fim),
    feriadosDisponiveis: feriadosDoAno !== null,
  };
}

// ---------- Gestão (ADMIN e PROFESSOR) ----------

export async function getEvento(user, id) {
  return toResponse(user, await findEditavelOrFail(user, id));
}

export async function createEvento(user, data) {
  await validateTurma(user, data.turmaId);
  const id = await eventoRepository.create({ ...data, autorId: user.id });
  return toResponse(user, await eventoRepository.findById(id));
}

export async function updateEvento(user, id, data) {
  const atual = await findEditavelOrFail(user, id);
  await validateTurma(user, data.turmaId, atual.turma_id);
  await eventoRepository.update(id, data);
  return toResponse(user, await eventoRepository.findById(id));
}

export async function deleteEvento(user, id) {
  await findEditavelOrFail(user, id);
  await eventoRepository.remove(id);
}
