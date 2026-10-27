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
