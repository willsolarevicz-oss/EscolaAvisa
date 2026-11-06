// Tradução da trilha de auditoria (método + rota) para algo legível na tela.

const VERBOS = { POST: 'Criou', PUT: 'Editou', PATCH: 'Alterou', DELETE: 'Excluiu' };

// Primeiro trecho da rota depois de /api → o que foi afetado.
const ENTIDADES = {
  usuarios: 'usuário',
  alunos: 'aluno',
  turmas: 'turma',
  disciplinas: 'disciplina',
  avisos: 'aviso',
  ocorrencias: 'ocorrência',
  notas: 'notas',
  eventos: 'evento',
  conversas: 'conversa',
  me: 'item do próprio usuário',
};

// Ações com nome próprio (a regra genérica ficaria estranha).
const ESPECIAIS = {
  'POST /api/auth/login': 'Login',
  'PATCH /api/usuarios/:id/ativo': 'Ativou/desativou usuário',
  'PATCH /api/alunos/:id/ativo': 'Ativou/desativou aluno',
  'PATCH /api/turmas/:id/ativo': 'Ativou/desativou turma',
  'PUT /api/notas/turmas/:id/disciplinas/:id': 'Lançou notas',
  'POST /api/conversas': 'Iniciou conversa',
  'POST /api/conversas/:id/mensagens': 'Enviou mensagem',
  'POST /api/conversas/:id/lida': 'Leu conversa',
  'POST /api/me/avisos/:id/visualizar': 'Leu aviso',
  'POST /api/me/ocorrencias/:id/ciencia': 'Deu ciência em ocorrência',
  'POST /api/turmas/:id/alunos': 'Matriculou aluno',
  'DELETE /api/turmas/:id/alunos/:id': 'Removeu matrícula',
  'POST /api/turmas/:id/professores': 'Atribuiu professor',
  'DELETE /api/turmas/:id/professores/:id': 'Removeu professor da turma',
  'POST /api/alunos/:id/responsaveis': 'Vinculou responsável',
  'PUT /api/alunos/:id/responsaveis/:id': 'Editou vínculo de responsável',
  'DELETE /api/alunos/:id/responsaveis/:id': 'Removeu vínculo de responsável',
  'POST /api/usuarios/:id/anonimizar': 'Anonimizou usuário',
  'POST /api/me/termos/aceite': 'Aceitou a Política e os Termos',
  // Gravada pelo script de retenção (npm run retencao), não por uma rota da API.
  'DELETE script:retencao/auditoria': 'Limpeza da auditoria (retenção)',
};

/** "POST /api/usuarios" → "Criou usuário"; desconhecido → "Criou registro". */
export function descreverAcao(metodo, rota) {
  const especial = ESPECIAIS[`${metodo} ${rota}`];
  if (especial) return especial;
  const entidade = ENTIDADES[rota.split('/')[2]] ?? 'registro';
  return `${VERBOS[metodo] ?? metodo} ${entidade}`;
}

/** Status HTTP → rótulo e cor do selo. */
export function resultadoAcao(status) {
  if (status < 400) return { label: 'OK', tone: 'success' };
  if (status === 401 || status === 403) return { label: 'Negado', tone: 'danger' };
  if (status === 429) return { label: 'Bloqueado', tone: 'danger' };
  if (status >= 500) return { label: 'Erro', tone: 'danger' };
  return { label: 'Recusado', tone: 'warning' };
}
