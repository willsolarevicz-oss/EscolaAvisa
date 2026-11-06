import { env } from '../config/env.js';
import * as auditoriaRepository from '../repositories/auditoriaRepository.js';

const METODOS_AUDITADOS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * "/api/usuarios/3f2c…/ativo?x=1" → { rota: "/api/usuarios/:id/ativo", recursoId: "3f2c…" }.
 * A rota normalizada agrupa ações iguais; o id fica em coluna própria.
 */
export function normalizarRota(originalUrl) {
  const caminho = originalUrl.split('?')[0];
  const ids = caminho.match(UUID_RE) ?? [];
  return { rota: caminho.replace(UUID_RE, ':id').slice(0, 200), recursoId: ids[0] ?? null };
}

/**
 * Registra, DEPOIS da resposta, toda requisição que altera dados: quem, rota, recurso, status e IP.
 * Nunca grava o corpo (senhas, dados pessoais). Uma falha ao gravar só é registrada no
 * console: a auditoria nunca derruba nem atrasa a operação do usuário.
 */
export function auditoria(req, res, next) {
  if (!METODOS_AUDITADOS.has(req.method)) return next();

  res.on('finish', () => {
    const { rota, recursoId } = normalizarRota(req.originalUrl);
    auditoriaRepository
      .registrar({
        usuarioId: req.user?.id ?? res.locals.auditoriaUsuarioId ?? null,
        metodo: req.method,
        rota,
        recursoId,
        status: res.statusCode,
        ip: req.ip ?? null,
      })
      .catch((error) => {
        if (!env.isTest) console.warn('[auditoria] não foi possível registrar:', error.message);
      });
  });
  return next();
}
