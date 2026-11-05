import { ROLES } from '../config/roles.js';
import { withTransaction } from '../database/transaction.js';
import * as alunoRepository from '../repositories/alunoRepository.js';
import * as alunoResponsavelRepository from '../repositories/alunoResponsavelRepository.js';
import * as responsavelRepository from '../repositories/responsavelRepository.js';
import * as usuarioRepository from '../repositories/usuarioRepository.js';
import { AppError } from '../utils/AppError.js';
import { rethrowUniqueAsConflict } from '../utils/dbErrors.js';
import { toAlunoResponse, toVinculoResponse } from '../utils/serializers.js';
import { isUuid } from '../utils/uuid.js';

const ALUNO_NOT_FOUND = 'Aluno não encontrado.';
const VINCULO_NOT_FOUND = 'Vínculo não encontrado.';

const UNIQUE_MESSAGES = {
  alunos_matricula_unique: { field: 'matricula', message: 'Já existe um aluno com esta matrícula.' },
  aluno_responsavel_unique: { field: 'usuarioId', message: 'Este responsável já está vinculado ao aluno.' },
  // Só acontece em corrida (dois pedidos ao mesmo tempo): o service desmarca o anterior antes.
  aluno_responsavel_principal_unique: {
    field: 'responsavelPrincipal',
    message: 'Este aluno já tem um responsável principal. Tente novamente.',
  },
};

const rethrowAsConflict = (error) => rethrowUniqueAsConflict(error, UNIQUE_MESSAGES);

async function findAlunoOrFail(id) {
  const aluno = isUuid(id) ? await alunoRepository.findById(id) : null;
  if (!aluno) throw AppError.notFound(ALUNO_NOT_FOUND);
  return aluno;
}

async function findVinculoOrFail(alunoId, vinculoId) {
  await findAlunoOrFail(alunoId);
  const vinculo = isUuid(vinculoId)
    ? await alunoResponsavelRepository.findByIdForAluno(vinculoId, alunoId)
    : null;
  if (!vinculo) throw AppError.notFound(VINCULO_NOT_FOUND);
  return vinculo;
}

/** O usuário escolhido precisa existir, ser RESPONSAVEL e estar ativo. */
async function findResponsavelUsuarioOrFail(usuarioId) {
  const usuario = await usuarioRepository.findById(usuarioId);
  const invalid = (message) =>
    AppError.badRequest('Dados inválidos. Verifique os campos informados.', [{ field: 'usuarioId', message }]);

  if (!usuario) throw invalid('Responsável não encontrado.');
  if (usuario.tipo_usuario !== ROLES.RESPONSAVEL) throw invalid('O usuário selecionado não é um responsável.');
  if (!usuario.ativo) throw invalid('Este responsável está desativado. Reative-o antes de vincular.');
  return usuario;
}

// ---------- Alunos ----------

export async function listAlunos({ page, pageSize, busca, ativo }) {
  const { rows, total } = await alunoRepository.list({ page, pageSize, busca, ativo });
  return {
    items: rows.map(toAlunoResponse),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

/** Detalhe do aluno já com os responsáveis vinculados (a tela de edição usa os dois). */
export async function getAluno(id) {
  const aluno = await findAlunoOrFail(id);
  const vinculos = await alunoResponsavelRepository.listByAluno(id);
  return { ...toAlunoResponse(aluno), responsaveis: vinculos.map(toVinculoResponse) };
}

export async function createAluno(data) {
  try {
    return toAlunoResponse(await alunoRepository.create(data));
  } catch (error) {
    return rethrowAsConflict(error);
  }
}

export async function updateAluno(id, data) {
  await findAlunoOrFail(id);
  try {
    const aluno = await alunoRepository.update(id, data);
    if (!aluno) throw AppError.notFound(ALUNO_NOT_FOUND);
    return toAlunoResponse(aluno);
  } catch (error) {
    return rethrowAsConflict(error);
  }
}

export async function setAlunoAtivo(id, ativo) {
  await findAlunoOrFail(id);
  const aluno = await alunoRepository.setAtivo(id, ativo);
  if (!aluno) throw AppError.notFound(ALUNO_NOT_FOUND);
  return toAlunoResponse(aluno);
}

// ---------- Vínculos aluno ↔ responsável ----------

export async function listVinculos(alunoId) {
  await findAlunoOrFail(alunoId);
  const vinculos = await alunoResponsavelRepository.listByAluno(alunoId);
  return vinculos.map(toVinculoResponse);
}

export async function createVinculo(alunoId, { usuarioId, parentesco, responsavelPrincipal, autorizadoReceberComunicacoes }) {
  await findAlunoOrFail(alunoId);
  await findResponsavelUsuarioOrFail(usuarioId);

  try {
    return await withTransaction(async (client) => {
      // Usuários RESPONSAVEL criados fora da API podem não ter o registro em `responsaveis` ainda.
      const responsavelId = await responsavelRepository.ensureForUsuario(usuarioId, client);
      if (responsavelPrincipal) {
        await alunoResponsavelRepository.clearPrincipal(alunoId, null, client);
      }
      const vinculoId = await alunoResponsavelRepository.create(
        { alunoId, responsavelId, parentesco, responsavelPrincipal, autorizadoReceberComunicacoes },
        client,
      );
      return toVinculoResponse(await alunoResponsavelRepository.findByIdForAluno(vinculoId, alunoId, client));
    });
  } catch (error) {
    return rethrowAsConflict(error);
  }
}

export async function updateVinculo(alunoId, vinculoId, data) {
  await findVinculoOrFail(alunoId, vinculoId);

  try {
    return await withTransaction(async (client) => {
      // Desmarcar o principal anterior e marcar o novo precisam acontecer juntos.
      if (data.responsavelPrincipal) {
        await alunoResponsavelRepository.clearPrincipal(alunoId, vinculoId, client);
      }
      await alunoResponsavelRepository.update(vinculoId, data, client);
      return toVinculoResponse(await alunoResponsavelRepository.findByIdForAluno(vinculoId, alunoId, client));
    });
  } catch (error) {
    return rethrowAsConflict(error);
  }
}

export async function removeVinculo(alunoId, vinculoId) {
  await findVinculoOrFail(alunoId, vinculoId);
  const removed = await alunoResponsavelRepository.remove(vinculoId, alunoId);
  if (!removed) throw AppError.notFound(VINCULO_NOT_FOUND);
}
