# Requisitos - EscolaAvisa (Tema 08)

## 1. Objetivo
Sistema de comunicação escola-responsáveis: a escola cadastra turmas, alunos
e responsáveis, registra avisos, notas e ocorrências, e o sistema notifica
automaticamente os responsáveis vinculados via bot do Discord.

## 2. Atores
- Staff da escola (secretaria/professor): cadastra turmas, alunos,
  responsáveis; lança avisos, notas e ocorrências.
- Responsável (pai/mãe/responsável legal): recebe notificações no Discord
  sobre o aluno vinculado a ele.

## 3. Requisitos funcionais (escopo mínimo)
- RF01: O sistema deve cadastrar turmas, alunos e responsáveis, e vincular
  responsáveis a alunos (relação N:N, com parentesco).
- RF02: O sistema deve enviar mensagem via bot do Discord quando um aviso,
  ocorrência ou nota for lançado para um aluno.
- RF03: O sistema deve registrar toda mensagem enviada e recebida no banco
  (tabela `mensagens`), com status (enfileirada/enviada/falha/respondida).
- RF04: O sistema deve receber, via webhook público em HTTPS, as interações
  do Discord (comando de vínculo e cliques de botão), validando a origem da
  requisição pela assinatura (Ed25519) do Discord.
- RF05: O sistema deve consultar a BrasilAPI (feriados) para exibir o
  calendário letivo, considerando dias não letivos no agendamento de avisos.
- RF06: O sistema deve exigir um passo de vínculo (opt-in) entre o
  responsável e o bot antes de qualquer envio: o responsável entra no
  servidor Discord da escola e roda o comando `/vincular <codigo>` gerado
  pela escola; só então seu `discord_user_id` é gravado e ele passa a
  receber notificações.
- RF07: O sistema deve autenticar o staff da escola (login com email/senha
  e JWT) para todo endpoint de escrita do domínio acadêmico.

## 4. Requisitos não funcionais
- RNF01: API própria em Python (FastAPI).
- RNF02: Banco PostgreSQL com migrations versionadas (Alembic).
- RNF03: Aplicação e banco orquestrados com Docker Compose em
  desenvolvimento.
- RNF04: Segredos fora do código (variáveis de ambiente / `.env`, nunca
  versionado).
- RNF05: Chave primária das tabelas em BIGINT auto-incremento — justificado
  pelo cenário de um único banco gerenciado, sem múltiplos servidores
  escrevendo simultaneamente (ver Aula 06 — Replicação, GUID e Snowflake
  ID).

## 5. Mensagens que o sistema envia

| Evento                        | Destinatário            | Conteúdo resumido                                  |
|-------------------------------|--------------------------|-----------------------------------------------------|
| Aviso geral criado             | Responsáveis da turma    | Título e corpo do aviso                             |
| Ocorrência registrada          | Responsáveis do aluno    | Descrição da ocorrência                             |
| Nota lançada                   | Responsáveis do aluno    | Disciplina, bimestre e valor da nota                |
| Confirmação de vínculo         | Responsável (ao vincular)| Confirmação de que o Discord foi vinculado com sucesso |

## 6. Entidades do banco (previsão inicial)
- `usuarios_staff`: id, nome, email, senha_hash, papel
- `turmas`: id, nome, ano_letivo, turno
- `alunos`: id, nome, matricula, data_nascimento, turma_id
- `responsaveis`: id, nome, email, telefone
- `aluno_responsavel`: aluno_id, responsavel_id, parentesco
- `discord_links`: id, responsavel_id, discord_user_id, status, linked_at
- `avisos`: id, turma_id, aluno_id, tipo (aviso|ocorrencia), titulo, corpo,
  criado_por
- `notas`: id, aluno_id, disciplina, valor, bimestre, criado_por
- `mensagens`: id, responsavel_id, discord_user_id, origem_tipo, origem_id,
  direcao, conteudo, discord_message_id, status

## 7. Fora do escopo
- Aplicativo móvel ou frontend web para os responsáveis (só o bot do
  Discord nesta entrega).
- Integração com Telegram (o grupo escolheu Discord como plataforma única).
- Múltiplos servidores de banco de dados / replicação multi-primary.
- Relatórios e dashboards analíticos avançados.
