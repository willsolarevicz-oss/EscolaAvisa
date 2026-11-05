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

/** Aluno no formato da API. dataNascimento é string AAAA-MM-DD (sem fuso horário). */
export function toAlunoResponse(aluno) {
  return {
    id: aluno.id,
    nome: aluno.nome,
    dataNascimento: aluno.data_nascimento,
    matricula: aluno.matricula,
    ativo: aluno.ativo,
    totalResponsaveis: aluno.total_responsaveis,
    criadoEm: aluno.criado_em,
    atualizadoEm: aluno.atualizado_em,
  };
}

/** Vínculo aluno ↔ responsável, com os dados do usuário responsável para exibição. */
export function toVinculoResponse(vinculo) {
  return {
    id: vinculo.id,
    alunoId: vinculo.aluno_id,
    parentesco: vinculo.parentesco,
    responsavelPrincipal: vinculo.responsavel_principal,
    autorizadoReceberComunicacoes: vinculo.autorizado_receber_comunicacoes,
    responsavel: {
      usuarioId: vinculo.usuario_id,
      nome: vinculo.usuario_nome,
      email: vinculo.usuario_email,
      telefone: vinculo.responsavel_telefone,
      ativo: vinculo.usuario_ativo,
    },
    criadoEm: vinculo.criado_em,
    atualizadoEm: vinculo.atualizado_em,
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
