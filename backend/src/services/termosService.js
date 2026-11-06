import { TERMOS_VERSAO } from '../config/termos.js';
import * as aceiteTermosRepository from '../repositories/aceiteTermosRepository.js';
import { AppError } from '../utils/AppError.js';

/** Situação do usuário em relação aos documentos vigentes (vai no login e no /auth/me). */
export async function situacao(usuarioId) {
  return { versao: TERMOS_VERSAO, aceito: await aceiteTermosRepository.jaAceitou(usuarioId, TERMOS_VERSAO) };
}

/**
 * Aceite da Política de Privacidade e dos Termos. A tela manda a versão que MOSTROU: se não for
 * a vigente (texto mudou num lado e não no outro, ou página antiga aberta), recusa com 409.
 */
export async function aceitar(usuarioId, versao, ip) {
  if (versao !== TERMOS_VERSAO) {
    throw AppError.conflict('Os documentos foram atualizados. Recarregue a página e leia a versão atual.');
  }
  await aceiteTermosRepository.registrar({ usuarioId, versao, ip });
  return situacao(usuarioId);
}
