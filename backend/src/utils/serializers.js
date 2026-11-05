/** Converte a linha do banco (snake_case) no formato da API (camelCase), sem a senha. */
export function toUsuarioResponse(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    tipoUsuario: usuario.tipo_usuario,
    ativo: usuario.ativo,
    criadoEm: usuario.criado_em,
    atualizadoEm: usuario.atualizado_em,
  };
}

/**
 * Usuário com os dados de responsável (telefone/CPF) quando o perfil for RESPONSAVEL.
 * Usado pela gestão de usuários; o /auth/me continua com o formato enxuto.
 */
export function toUsuarioDetailResponse(usuario, responsavel) {
  const response = toUsuarioResponse(usuario);
  if (usuario.tipo_usuario === 'RESPONSAVEL') {
    response.responsavel = {
      telefone: responsavel?.telefone ?? null,
      cpf: responsavel?.cpf ?? null,
    };
  }
  return response;
}
