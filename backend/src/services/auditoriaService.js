import * as auditoriaRepository from '../repositories/auditoriaRepository.js';
import { toPagination } from '../utils/pagination.js';

/** Trilha de auditoria para a administração (o registro é feito pelo middleware `auditoria`). */
export async function listAuditoria({ page, pageSize, busca, falhas }) {
  const { rows, total } = await auditoriaRepository.list({ page, pageSize, busca, falhas });
  return {
    items: rows.map((r) => ({
      id: r.id,
      criadoEm: r.criado_em,
      usuario: r.usuario_id ? { id: r.usuario_id, nome: r.usuario_nome, email: r.usuario_email } : null,
      metodo: r.metodo,
      rota: r.rota,
      recursoId: r.recurso_id,
      status: r.status,
      ip: r.ip,
    })),
    pagination: toPagination({ page, pageSize, total }),
  };
}
