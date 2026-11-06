import { randomBytes } from 'node:crypto';
import { ROLES } from '../config/roles.js';
import { withTransaction } from '../database/transaction.js';
import * as responsavelRepository from '../repositories/responsavelRepository.js';
import * as usuarioRepository from '../repositories/usuarioRepository.js';
import { AppError } from '../utils/AppError.js';
import { rethrowUniqueAsConflict } from '../utils/dbErrors.js';
import { hashPassword } from '../utils/password.js';
import { toUsuarioDetailResponse, toUsuarioResponse } from '../utils/serializers.js';
import { toPagination } from '../utils/pagination.js';
import { isUuid } from '../utils/uuid.js';

const NOT_FOUND_MESSAGE = 'Usuário não encontrado.';

// Violações de UNIQUE conhecidas viram 409 com mensagem específica (e não a genérica do errorHandler).
const UNIQUE_MESSAGES = {
  usuarios_email_unique: { field: 'email', message: 'Já existe um usuário com este e-mail.' },
  responsaveis_cpf_unique: { field: 'cpf', message: 'Já existe um responsável com este CPF.' },
};

const rethrowAsConflict = (error) => rethrowUniqueAsConflict(error, UNIQUE_MESSAGES);

async function findExistingOrFail(id) {
  // Id malformado é tratado como inexistente (404), sem chegar ao banco.
  const usuario = isUuid(id) ? await usuarioRepository.findById(id) : null;
  if (!usuario) throw AppError.notFound(NOT_FOUND_MESSAGE);
  return usuario;
}

/** Usuário anonimizado não volta: sem dados reais, editar, reativar ou trocar senha não faz sentido. */
async function findAlteravelOrFail(id) {
  const usuario = await findExistingOrFail(id);
  if (usuario.anonimizado_em) {
    throw AppError.conflict('Este usuário foi anonimizado e não pode mais ser alterado.');
  }
  return usuario;
}

async function toDetail(usuario, db) {
  const responsavel =
    usuario.tipo_usuario === ROLES.RESPONSAVEL
      ? await responsavelRepository.findByUsuarioId(usuario.id, db)
      : null;
  return toUsuarioDetailResponse(usuario, responsavel);
}

export async function listUsuarios({ page, pageSize, busca, tipo, ativo }) {
  const { rows, total } = await usuarioRepository.list({
    page,
    pageSize,
    busca,
    tipoUsuario: tipo,
    ativo,
  });

  return {
    items: rows.map(toUsuarioResponse),
    pagination: toPagination({ page, pageSize, total }),
  };
}

export async function getUsuario(id) {
  return toDetail(await findExistingOrFail(id));
}

export async function createUsuario({ nome, email, senha, tipoUsuario, telefone, cpf }) {
  const senhaHash = await hashPassword(senha);

  try {
    // Usuário e dados de responsável são gravados juntos: se o CPF repetir, o usuário também não fica.
    return await withTransaction(async (client) => {
      const usuario = await usuarioRepository.create({ nome, email, senhaHash, tipoUsuario }, client);
      if (tipoUsuario === ROLES.RESPONSAVEL) {
        await responsavelRepository.upsertByUsuarioId(usuario.id, { telefone, cpf }, client);
      }
      return toDetail(usuario, client);
    });
  } catch (error) {
    return rethrowAsConflict(error);
  }
}

export async function updateUsuario(id, { nome, email, telefone, cpf }) {
  const atual = await findAlteravelOrFail(id);
  const isResponsavel = atual.tipo_usuario === ROLES.RESPONSAVEL;

  if (!isResponsavel && (telefone !== null || cpf !== null)) {
    const fields = [
      telefone !== null && 'telefone',
      cpf !== null && 'cpf',
    ].filter(Boolean);
    throw AppError.badRequest(
      'Dados inválidos. Verifique os campos informados.',
      fields.map((field) => ({ field, message: 'Este campo só se aplica a responsáveis.' })),
    );
  }

  try {
    return await withTransaction(async (client) => {
      const usuario = await usuarioRepository.update(id, { nome, email }, client);
      if (!usuario) throw AppError.notFound(NOT_FOUND_MESSAGE);
      if (isResponsavel) {
        await responsavelRepository.upsertByUsuarioId(id, { telefone, cpf }, client);
      }
      return toDetail(usuario, client);
    });
  } catch (error) {
    return rethrowAsConflict(error);
  }
}

export async function setUsuarioAtivo(id, ativo, currentUser) {
  await findAlteravelOrFail(id);

  // Garante que sempre reste ao menos um admin ativo (quem desativa precisa estar ativo).
  if (!ativo && id === currentUser.id) {
    throw AppError.badRequest('Você não pode desativar o seu próprio usuário.');
  }

  const usuario = await usuarioRepository.setAtivo(id, ativo);
  if (!usuario) throw AppError.notFound(NOT_FOUND_MESSAGE);
  return toDetail(usuario);
}

export async function resetSenha(id, senha) {
  await findAlteravelOrFail(id);
  const updated = await usuarioRepository.updatePasswordHash(id, await hashPassword(senha));
  if (!updated) throw AppError.notFound(NOT_FOUND_MESSAGE);
}

/**
 * Anonimização a pedido do titular (LGPD art. 18). Irreversível. Regras:
 * - não pode ser o próprio admin;
 * - o usuário precisa estar DESATIVADO antes (dois passos: evita anonimizar alguém em uso por engano);
 * - alunos não são anonimizados por aqui: o histórico escolar tem guarda obrigatória por lei.
 */
export async function anonimizarUsuario(id, currentUser) {
  if (id === currentUser.id) throw AppError.badRequest('Você não pode anonimizar o seu próprio usuário.');
  const usuario = await findAlteravelOrFail(id);
  if (usuario.ativo) {
    throw AppError.conflict('Desative o usuário antes de anonimizar.');
  }
  // Senha aleatória descartada: ninguém mais consegue entrar com esta conta.
  const senhaHash = await hashPassword(randomBytes(32).toString('base64url'));
  const anonimizado = await withTransaction((client) => usuarioRepository.anonimizar(id, senhaHash, client));
  return toDetail(anonimizado);
}
