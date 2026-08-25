# EscolaAvisa — Fase 1: Fundação — Design

## Contexto

Tema 08 (Projeto Integrador — Desenvolvimento de Sistemas para Web/Mobile IV,
Engenharia de Software, UGV): EscolaAvisa é um sistema de comunicação
escola-responsáveis. Cenário: bilhetes impressos não chegam aos pais. A
escola cadastra turmas, alunos e responsáveis; registra avisos, notas e
ocorrências; o sistema notifica os responsáveis vinculados via bot do
Discord.

Equipe: Luis Guilherme Frankio, Cleomar Dziurkowski, Will Solarevicz.

Este documento cobre apenas a **Fase 1 — Fundação**: schema de banco, API
REST central e autenticação. As fases seguintes (Discord, BrasilAPI,
DevOps/nuvem) têm specs próprias.

## Requisitos que direcionam esta fase

- API própria REST (Node.js ou Python — grupo escolheu **Python**).
- PostgreSQL com migrations versionadas.
- Entidades mínimas: `turmas`, `alunos`, `responsaveis`, `avisos`, `notas`,
  `mensagens`.
- Docker Compose orquestrando o ambiente de desenvolvimento (app + banco
  local).
- Repositório GitHub com tag por aula (aula-01 … aula-18) e release final
  v1.0.0.

## Decisões

### Stack
**FastAPI** (async, validação via Pydantic, OpenAPI/Swagger de graça — útil
para a apresentação e para responder rápido ao webhook do Discord na Fase 2)
+ **SQLAlchemy + Alembic** para modelagem e migrations versionadas.

### Estratégia de chave primária (Aula 06 — Replicação, GUID e Snowflake ID)
**BIGINT auto-incremento (IDENTITY)** em todas as tabelas.

Justificativa: o banco é um único Postgres gerenciado (RDS/Cloud SQL/Azure
DB), sem réplicas multi-primary — só um servidor escreve. Segundo o
comparativo da aula, "sistema com um servidor só → auto-incremento resolve e
é a resposta mais honesta". Snowflake ID resolveria colisão entre múltiplos
servidores escrevendo simultaneamente, o que não é o caso aqui; UUID
traria custo de índice e tamanho sem necessidade real (o ID nunca precisa
nascer fora do banco). Essa escolha deve constar na resposta do exercício 12
do material da aula.

### Autenticação
Login simples para staff da escola (professor/secretaria): email + senha
(hash) → JWT. Endpoints de escrita do domínio acadêmico exigem token.
Não há self-signup público — contas de staff são criadas via seed/migration
inicial.

## Modelo de dados

```
usuarios_staff
  id BIGINT PK, nome, email UNIQUE, senha_hash, papel, created_at

turmas
  id BIGINT PK, nome, ano_letivo, turno, created_at

alunos
  id BIGINT PK, nome, matricula, data_nascimento,
  turma_id -> turmas.id, created_at

responsaveis
  id BIGINT PK, nome, email, telefone, created_at

aluno_responsavel   (N:N)
  aluno_id -> alunos.id, responsavel_id -> responsaveis.id, parentesco

discord_links       (vínculo opt-in — preparação para Fase 2)
  id BIGINT PK, responsavel_id -> responsaveis.id UNIQUE,
  discord_user_id, status ('pendente'|'confirmado'), linked_at

avisos              (avisos gerais E ocorrências — campo `tipo` distingue)
  id BIGINT PK, turma_id -> turmas.id NULLABLE,
  aluno_id -> alunos.id NULLABLE,
  tipo ('aviso'|'ocorrencia'), titulo, corpo,
  criado_por -> usuarios_staff.id, created_at

notas
  id BIGINT PK, aluno_id -> alunos.id, disciplina, valor, bimestre,
  criado_por -> usuarios_staff.id, created_at

mensagens            (log obrigatório de toda mensagem enviada/recebida)
  id BIGINT PK, responsavel_id -> responsaveis.id, discord_user_id,
  origem_tipo ('aviso'|'nota'|'interacao_recebida'), origem_id NULLABLE,
  direcao ('saida'|'entrada'), conteudo, discord_message_id,
  status ('enfileirada'|'enviada'|'falha'|'respondida'),
  created_at, updated_at
```

Nota: `usuarios_staff` e `discord_links` não estão na lista de "entidades
mínimas" do enunciado, mas são exigidas por outras partes dele (login da
escola; vínculo opt-in obrigatório com o bot). `avisos` cobre ocorrências via
o campo `tipo` em vez de uma 7ª tabela, já que ambos são texto livre que
dispara notificação. `notas` fica separada por ter estrutura própria
(disciplina/valor/bimestre).

## Endpoints (Fase 1 — sem o webhook do Discord, que é da Fase 2)

```
POST /auth/login

GET/POST/PUT/DELETE  /turmas, /turmas/{id}
GET/POST/PUT/DELETE  /alunos, /alunos/{id}        (filtrável por turma_id)
GET/POST/PUT/DELETE  /responsaveis, /responsaveis/{id}
POST/DELETE          /alunos/{id}/responsaveis

POST                 /avisos      (tipo=aviso|ocorrencia)
GET                  /avisos, /avisos/{id}
POST                 /notas
GET                  /notas
GET                  /mensagens   (auditoria — populada de verdade só na Fase 2)
```

Todos exigem JWT exceto `/auth/login`. O disparo de notificação em
`POST /avisos`/`POST /notas` é modelado nesta fase (grava em `mensagens` com
status `enfileirada`), mas o envio real ao Discord é implementado na Fase 2.

## Estrutura de pastas

```
escolaavisa/
├── app/
│   ├── main.py
│   ├── core/            (config, security/JWT, deps)
│   ├── db/               (engine, session, base)
│   ├── models/            (SQLAlchemy)
│   ├── schemas/            (Pydantic)
│   ├── routers/             (turmas.py, alunos.py, responsaveis.py,
│   │                         avisos.py, notas.py, auth.py)
│   ├── services/             (notificacao_service.py — grava mensagens
│   │                          enfileiradas; discord_client.py chega na
│   │                          Fase 2)
│   └── integrations/          (brasilapi.py — Fase 3)
├── alembic/
├── tests/
├── docker-compose.yml           (api + postgres)
├── Dockerfile
├── .env.example
├── pyproject.toml
└── README.md
```

## Testes

`pytest` + `httpx.AsyncClient` contra a app FastAPI, banco de teste separado
via fixture (migrations aplicadas no setup). Cobertura mínima: CRUD de cada
entidade, autenticação (login válido/inválido, endpoint protegido sem
token), vínculo aluno↔responsável, criação de aviso/nota gerando registro em
`mensagens` com status `enfileirada`.

## Fora de escopo nesta fase

- Envio real de mensagens ao Discord e validação de assinatura do webhook
  (Fase 2 — Discord).
- Integração BrasilAPI / calendário letivo (Fase 3).
- CI, deploy em nuvem, banco gerenciado, DNS/HTTPS (Fase 4 — DevOps).
