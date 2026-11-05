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

export function toDisciplinaResponse(disciplina) {
  return {
    id: disciplina.id,
    nome: disciplina.nome,
    descricao: disciplina.descricao,
    ativo: disciplina.ativo,
    criadoEm: disciplina.criado_em,
    atualizadoEm: disciplina.atualizado_em,
  };
}

export function toTurmaResponse(turma) {
  return {
    id: turma.id,
    nome: turma.nome,
    anoLetivo: turma.ano_letivo,
    turno: turma.turno,
    descricao: turma.descricao,
    ativo: turma.ativo,
    totalAlunos: turma.total_alunos,
    totalProfessores: turma.total_professores,
    criadoEm: turma.criado_em,
    atualizadoEm: turma.atualizado_em,
  };
}

/** Matrícula ativa de um aluno em uma turma (vista a partir da turma). */
export function toMatriculaResponse(matricula) {
  return {
    id: matricula.id,
    anoLetivo: matricula.ano_letivo,
    aluno: {
      id: matricula.aluno_id,
      nome: matricula.aluno_nome,
      matricula: matricula.aluno_matricula,
      ativo: matricula.aluno_ativo,
    },
    criadoEm: matricula.criado_em,
  };
}

/** Professor ↔ disciplina em uma turma. */
export function toAtribuicaoResponse(atribuicao) {
  return {
    id: atribuicao.id,
    professor: {
      id: atribuicao.professor_id,
      nome: atribuicao.professor_nome,
      email: atribuicao.professor_email,
      ativo: atribuicao.professor_ativo,
    },
    disciplina: {
      id: atribuicao.disciplina_id,
      nome: atribuicao.disciplina_nome,
      ativo: atribuicao.disciplina_ativo,
    },
    criadoEm: atribuicao.criado_em,
  };
}

/** Aviso visto por quem publica (com contagem de leituras). */
export function toAvisoResponse(aviso) {
  return {
    id: aviso.id,
    titulo: aviso.titulo,
    conteudo: aviso.conteudo,
    publico: aviso.publico,
    turma: aviso.turma_id ? { id: aviso.turma_id, nome: aviso.turma_nome, anoLetivo: aviso.turma_ano_letivo } : null,
    aluno: aviso.aluno_id ? { id: aviso.aluno_id, nome: aviso.aluno_nome } : null,
    autor: { id: aviso.autor_id, nome: aviso.autor_nome },
    ativo: aviso.ativo,
    publicadoEm: aviso.publicado_em,
    totalDestinatarios: aviso.total_destinatarios,
    totalLidos: aviso.total_lidos,
  };
}

export function toDestinatarioResponse(destinatario) {
  return {
    usuario: { id: destinatario.usuario_id, nome: destinatario.nome, email: destinatario.email },
    lido: destinatario.visualizado_em !== null,
    visualizadoEm: destinatario.visualizado_em,
  };
}

/** Aviso visto pelo responsável destinatário (sem dados de outros destinatários). */
export function toMeuAvisoResponse(aviso) {
  return {
    id: aviso.id,
    titulo: aviso.titulo,
    conteudo: aviso.conteudo,
    publico: aviso.publico,
    turmaNome: aviso.turma_nome,
    alunoNome: aviso.aluno_nome,
    autorNome: aviso.autor_nome,
    publicadoEm: aviso.publicado_em,
    lido: aviso.visualizado_em !== null,
    visualizadoEm: aviso.visualizado_em,
  };
}

/** Ocorrência vista por quem registra (com contagem de ciências). */
export function toOcorrenciaResponse(ocorrencia) {
  return {
    id: ocorrencia.id,
    tipo: ocorrencia.tipo,
    descricao: ocorrencia.descricao,
    dataOcorrencia: ocorrencia.data_ocorrencia,
    aluno: { id: ocorrencia.aluno_id, nome: ocorrencia.aluno_nome, matricula: ocorrencia.aluno_matricula },
    autor: { id: ocorrencia.autor_id, nome: ocorrencia.autor_nome },
    ativo: ocorrencia.ativo,
    criadoEm: ocorrencia.criado_em,
    totalResponsaveis: ocorrencia.total_responsaveis,
    totalCientes: ocorrencia.total_cientes,
  };
}

export function toCienciaResponse(ciencia) {
  return {
    usuario: { id: ciencia.usuario_id, nome: ciencia.nome, email: ciencia.email },
    ciente: ciencia.ciente_em !== null,
    cienteEm: ciencia.ciente_em,
  };
}

/** Ocorrência vista pelo responsável. */
export function toMinhaOcorrenciaResponse(ocorrencia) {
  return {
    id: ocorrencia.id,
    tipo: ocorrencia.tipo,
    descricao: ocorrencia.descricao,
    dataOcorrencia: ocorrencia.data_ocorrencia,
    alunoNome: ocorrencia.aluno_nome,
    autorNome: ocorrencia.autor_nome,
    criadoEm: ocorrencia.criado_em,
    ciente: ocorrencia.ciente_em !== null,
    cienteEm: ocorrencia.ciente_em,
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
