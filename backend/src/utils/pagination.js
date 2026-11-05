/** Metadados de paginação no formato padrão das listagens (`{ items, pagination }`). */
export function toPagination({ page, pageSize, total }) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
