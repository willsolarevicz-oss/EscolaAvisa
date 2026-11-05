/**
 * Com quem o usuário logado está falando nesta conversa:
 * responsável → "Secretaria" ou "Prof. Fulano"; escola → nome do responsável.
 */
export function outroLado(conversa, tipoUsuario) {
  if (tipoUsuario === 'RESPONSAVEL') {
    return conversa.canal === 'SECRETARIA' ? 'Secretaria' : `Prof. ${conversa.professor?.nome ?? ''}`.trim();
  }
  return conversa.responsavel.nome;
}

/** Texto do canal para a escola: deixa claro se é da secretaria (todos os admins veem). */
export function canalLabel(canal) {
  return canal === 'SECRETARIA' ? 'Secretaria' : 'Professor';
}
