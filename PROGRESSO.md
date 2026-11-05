# PROGRESSO — EscolaAvis

> Memória persistente do desenvolvimento. **Leia inteiro antes de mexer no projeto** e atualize ao final de cada sessão.
> Última atualização: 2026-11-04 — fim da Fase 5 (avisos com controle de leitura). Branch: `feat/fase-5-avisos`.

---

## Sistema

O **EscolaAvis** é um sistema web de comunicação entre a escola e os responsáveis pelos alunos. Na versão completa terá: administradores, professores, responsáveis, alunos, turmas, disciplinas, notas, avisos, ocorrências, mensagens, calendário escolar, integração com a BrasilAPI e controle de visualização de comunicados.

## Tecnologias

| Camada    | Stack                                                                                     |
| --------- | ----------------------------------------------------------------------------------------- |
| Frontend  | React 19 + Vite 8, JavaScript, React Router 7 (`react-router`), Axios, CSS Modules, lucide-react (ícones), fonte Inter (`@fontsource-variable/inter`) |
| Backend   | Node.js 22.12+ (ESM), Express 5, `pg`, node-pg-migrate 9 (migrations em SQL), zod |
| Segurança | jsonwebtoken (HS256), bcrypt (custo 12), helmet, cors, express-rate-limit                 |
| Banco     | PostgreSQL (testado no 17)                                                                |
| Testes    | `node:test` (nativo) + supertest; ESLint no frontend                                      |

## Arquitetura

```
escola-avisa/
├── backend/
│   ├── migrations/          SQL versionado (node-pg-migrate). Nunca editar migration já aplicada.
│   ├── seeds/               adminSeed.js (idempotente) + run.js (entrada do npm run seed)
│   ├── tests/               node:test + supertest; helpers/testDb.js recria o banco *_test
│   └── src/
│       ├── config/          env.js (lê e VALIDA o .env), roles.js (perfis), turnos.js
│       ├── database/        pool.js (pg Pool + query parametrizada), migrate.js (CLI/programático),
│       │                    transaction.js (withTransaction: BEGIN/COMMIT/ROLLBACK),
│       │                    sqlHelpers.js (containsPattern: busca ILIKE escapada)
│       ├── repositories/    SQL puro, um arquivo por tabela/agregado
│       ├── services/        regras de negócio (não conhecem req/res)
│       ├── controllers/     traduzem HTTP <-> service
│       ├── validators/      schemas zod (commonValidators: nome, e-mail, senha, telefone, CPF,
│       │                    optionalTextSchema, listQueryShape e setAtivoSchema reutilizáveis)
│       ├── middlewares/     authenticate, authorize, validateBody/validateQuery, rate limit, errorHandler
│       ├── routes/          index.js agrega tudo sob /api; meRoutes.js = rotas do próprio usuário (/api/me)
│       ├── utils/           AppError, jwt, password, serializers, uuid (isUuid), cpf (isValidCpf),
│       │                    dbErrors (rethrowUniqueAsConflict: UNIQUE → 409 com campo), pagination (toPagination)
│       ├── app.js           monta o Express (sem listen; usado pelos testes)
│       └── server.js        checa o banco, faz listen e shutdown gracioso
└── frontend/
    └── src/
        ├── config/          navigation.js (itens da sidebar e quais estão disponíveis)
        ├── contexts/        authContext.js (contexto + status) e AuthProvider.jsx (lógica da sessão)
        ├── hooks/           useAuth, useApiHealth, useDebouncedValue, usePaginatedList (listagem com
        │                    filtros na URL), useFlashMessage (mensagem entre páginas), useAtivoToggle
        │                    (confirmar + ativar/desativar em listagens), useEntityLoader (carregar registro
        │                    por id: loading/notfound/error/reload — usado em todos os formulários e detalhes)
        ├── services/        api.js (Axios central + interceptors), authService, healthService, usuarioService,
        │                    alunoService, disciplinaService, turmaService, avisoService
        ├── routes/          AppRoutes, ProtectedRoute, PublicOnlyRoute, RoleRoute (perfis; só UX)
        ├── layouts/         DashboardLayout (sidebar + header + <Outlet/>),
        │                    SessionAwareLayout (logado → DashboardLayout; deslogado → página avulsa)
        ├── components/      Logo, Button (aceita `to`), TextField, SelectField, Alert, Badge, PageHeader
        │                    (título + breadcrumbs), Pagination, ConfirmDialog (<dialog>), CheckboxField, SearchPicker
        │                    (buscar e selecionar), RowActions (editar/ativar/desativar), TextAreaField, ReadProgress
        │                    ("X de Y leram"), Sidebar, Header, FullScreenStatus
        ├── pages/           LoginPage, DashboardPage, NotFoundPage, ForbiddenPage,
        │                    usuarios/ (UsuariosListPage, UsuarioFormPage — criar e editar),
        │                    alunos/ (AlunosListPage, AlunoFormPage, AlunoResponsaveisSection),
        │                    disciplinas/ (lista + formulário), turmas/ (TurmasListPage, TurmaFormPage,
        │                    TurmaAlunosSection, TurmaProfessoresSection), avisos/ (lista, novo, detalhe com
        │                    controle de leitura), meus-avisos/ (lista e leitura para o responsável)
        ├── utils/           tokenStorage (token + expiresAt), formatters (inclui turnos/anos), apiErrors (toFieldErrors)
        └── styles/          global.css (design tokens), ListPage.module.css e FormPage.module.css
                             (estilos compartilhados por todas as listagens e formulários),
                             RelationSection.module.css (seções de vínculos: responsáveis, alunos, professores)
    └── public/              favicon.svg, robots.txt (bloqueia indexação)
```

**Fluxo de uma requisição:** `routes → middlewares (authenticate/authorize/validateBody) → controller → service → repository → PostgreSQL`. Erros sobem para o `errorHandler` central.

**Fluxo de autenticação no frontend:**
1. `AuthProvider` lê o token e o `expiresAt` do `localStorage`. Se existir e não estiver expirado, status = `checking` e chama `GET /auth/me`.
2. 200 → `authenticated`. 401 → limpa sessão e vai para `/login` com aviso. Servidor fora → tela "Não foi possível conectar" com "Tentar novamente" (o token **não** é apagado).
3. Qualquer 401 em outra chamada (interceptor do Axios) encerra a sessão. Exceção: o próprio login (`skipAuthHandler`).
4. Um timer encerra a sessão quando `expiresAt` chega. `expiresAt` = relógio local no momento do login + `expiresIn` devolvido pelo servidor (nunca o `exp` do JWT — ver Decisões).
5. Logout/login em outra aba é sincronizado pelo evento `storage`.

## Banco de dados

Todas as PKs são `UUID` (`gen_random_uuid()`), todas as tabelas de entidade têm `criado_em`/`atualizado_em` (`TIMESTAMPTZ`) e um trigger `set_atualizado_em()` mantém `atualizado_em` automaticamente.

| Tabela              | Campos principais                                                                                   | Regras de integridade |
| ------------------- | --------------------------------------------------------------------------------------------------- | --------------------- |
| `usuarios`          | nome, email, **senha_hash**, tipo_usuario, ativo                                                     | e-mail único e obrigatoriamente minúsculo/sem espaços; `tipo_usuario` ∈ {ADMIN, PROFESSOR, RESPONSAVEL} (CHECK) |
| `alunos`            | nome, data_nascimento, matricula, ativo                                                              | matrícula única; nome/matrícula não vazios |
| `responsaveis`      | usuario_id, telefone, cpf (opcional)                                                                 | 1:1 com `usuarios` (UNIQUE usuario_id, FK RESTRICT); CPF único quando informado, 11 dígitos; telefone 10–13 dígitos |
| `aluno_responsavel` | aluno_id, responsavel_id, parentesco, responsavel_principal, autorizado_receber_comunicacoes         | N:N; par único; **no máximo 1 responsável principal por aluno** (índice único parcial); CASCADE nos dois lados |
| `turmas`            | nome, ano_letivo, turno, descricao, ativo                                                            | turno ∈ {MATUTINO, VESPERTINO, NOTURNO, INTEGRAL}; ano 2000–2100; nome único por (ano, turno) sem diferenciar maiúsculas |
| `disciplinas`       | nome, descricao, ativo                                                                               | nome único (case-insensitive) |
| `aluno_turma`       | aluno_id, turma_id, ano_letivo, ativo                                                                | N:N com histórico; **FK composta (turma_id, ano_letivo)** garante ano coerente com a turma; **aluno ativo em só 1 turma por ano** (índice único parcial) |
| `professor_turma`   | professor_id (→ usuarios), turma_id, disciplina_id                                                   | trio único; professor e disciplina RESTRICT, turma CASCADE |
| `avisos`            | titulo, conteudo, autor_id, publico (TODOS/TURMA/ALUNO), turma_id, aluno_id, ativo, publicado_em     | CHECK garante coerência público ↔ alvo; FKs RESTRICT; não é editado depois de publicado |
| `aviso_destinatarios` | aviso_id, usuario_id, visualizado_em                                                               | PK (aviso_id, usuario_id); snapshot dos destinatários gravado na publicação; CASCADE ao aviso |
| `pgmigrations`      | controle interno do node-pg-migrate                                                                  | — |

Relacionamentos:
- `usuarios 1 — 0..1 responsaveis`
- `alunos N — N responsaveis` (via `aluno_responsavel`)
- `alunos N — N turmas` (via `aluno_turma`, histórico por ano letivo)
- `usuarios(PROFESSOR) N — N turmas × disciplinas` (via `professor_turma`)
- `avisos N — N usuarios(RESPONSAVEL)` (via `aviso_destinatarios`, com a data de leitura)

Migrations (em ordem): `1793059200000_funcao-atualizado-em`, `1793059201000_criar-usuarios`, `1793059202000_criar-alunos-e-responsaveis`, `1793059203000_criar-turmas-e-disciplinas`, `1793059204000_criar-avisos`.

## Implementado

- [x] Estrutura de pastas backend/frontend
- [x] Configuração por `.env` validada na inicialização (falha cedo se faltar algo)
- [x] Conexão PostgreSQL com pool; queries 100% parametrizadas
- [x] Migrations (up e down testados) + seed idempotente do admin
- [x] Login com bcrypt, mensagem genérica para e-mail/senha errados, proteção contra timing attack (hash "dummy")
- [x] JWT com `sub` (id) e `tipo_usuario`, HS256 fixado, expiração configurável
- [x] Middleware `authenticate` (token, assinatura, expiração, usuário existe e está ativo)
- [x] Middleware `authorize(...perfis)` com perfil lido do BANCO, não do token
- [x] Rota de verificação RBAC `/api/admin/ping` (somente ADMIN)
- [x] Helmet, CORS restrito ao frontend, limite de body 100kb, rate limit no login
- [x] Tratamento central de erros (formato `{ success: false, message }`, sem stack trace, erros do PG mapeados para 400/409)
- [x] Health check com teste real do banco (503 se o banco cair)
- [x] Frontend: login (validação, mostrar/ocultar senha, loading, erros amigáveis), sessão persistente, rotas protegidas, dashboard inicial, logout
- [x] Página 404 sensível à sessão: logado → dentro do layout, com "Voltar ao dashboard" (+ "Página anterior" se houver histórico); deslogado → página avulsa com "Ir para o login"
- [x] `robots.txt` (`Disallow: /`) + `<meta name="robots" content="noindex, nofollow">`
- [x] Sidebar com todos os módulos futuros (desabilitados com "Em breve"), gaveta em tablet/celular (fecha com Esc/clique fora)
- [x] Dashboard sem números falsos ("—" + "Em breve"); painel de status com dados reais do `/api/health`
- [x] **Gestão de usuários (Fase 2, somente ADMIN)**: listagem com busca, filtro por perfil/situação e paginação (filtros na URL); criar (responsável grava `responsaveis` na mesma transação); editar nome/e-mail/telefone/CPF; ativar/desativar com confirmação; redefinir senha; política de senha; CPF validado pelos dígitos verificadores; máscaras de CPF/telefone; rota e item da sidebar só para ADMIN; breadcrumbs
- [x] **Alunos e vínculos (Fase 3, somente ADMIN)**: listagem (busca por nome/matrícula, situação, paginação, contagem de responsáveis com alerta "Sem responsável"); cadastro e edição (matrícula em maiúsculas, data de nascimento sem problema de fuso, idade calculada); ativar/desativar; na edição, seção Responsáveis: buscar responsável ativo, vincular com parentesco/principal/autorizado, editar e remover vínculo; troca de principal em transação
- [x] Card "Alunos" do dashboard com total real de alunos ativos (ADMIN); para outros perfis aparece como "Restrito"
- [x] **Disciplinas (Fase 4, ADMIN)**: lista (busca, situação), cadastro/edição (nome único sem diferenciar maiúsculas), ativar/desativar
- [x] **Turmas (Fase 4, ADMIN)**: lista (busca, ano letivo, turno, situação, contagem de alunos/professores), cadastro/edição; na edição, seção **Alunos** (matricular com busca; transferência entre turmas do mesmo ano com confirmação; encerrar matrícula preservando histórico) e seção **Professores e disciplinas** (atribuir professor ativo + disciplina ativa; remover)
- [x] Ano letivo da turma travado quando já houve matrícula; turma desativada não aceita alterações em alunos/professores
- [x] Tela do aluno mostra a turma atual (com link); card "Turmas" do dashboard com total real de turmas ativas no ano
- [x] **Avisos (Fase 5)**: ADMIN publica para todos, uma turma ou um aluno; PROFESSOR só para turmas em que leciona; destinatários = responsáveis ativos e autorizados de alunos ativos, gravados na publicação; publicação sem destinatários é recusada sem gravar nada; arquivar/reativar; detalhe com controle de leitura (lidos/não lidos, data de leitura)
- [x] **Meus avisos (responsável)**: lista com destaque para não lidos e filtro; abrir o aviso registra a leitura (idempotente); aviso arquivado some
- [x] Dashboard por perfil: card Avisos real para ADMIN (publicados), PROFESSOR (os dele) e RESPONSAVEL (não lidos)
- [x] `useEntityLoader` aplicado aos 4 formulários de edição (fim da duplicação de carregamento)
- [x] **Testes automatizados: 128 passando** (`npm test` no backend): health, login, /me, tokens inválidos/expirados/forjados, RBAC, rate limit (incluindo X-Forwarded-For forjado e TRUST_PROXY), validação do .env, constraints do banco, gestão de usuários (25 testes, incluindo rollback da transação), alunos e vínculos (15 testes), disciplinas (5 testes), turmas/matrícula/professores (17 testes), avisos (15 testes)
- [x] `JWT_EXPIRES_IN` e `TRUST_PROXY` validados na inicialização (a API não sobe com valor inválido)
- [x] Teste manual no navegador: login, erro de senha, persistência após reload, logout, redirecionamento, token inválido/expirado, desktop/tablet/celular; gestão de usuários completa (criar, conflito de CPF, busca, edição, redefinir senha, desativar/cancelar com Esc, acesso negado para professor); alunos completos (cadastro, vínculos, troca de principal, edição e remoção de vínculo, card do dashboard, regressão da lista de usuários); turmas/disciplinas completos (cadastro, nome repetido, matrícula, transferência confirmada, atribuição de professor, ano travado, turma atual no aluno, desativar/reativar usuário via RowActions, celular); avisos com os 3 perfis (publicação pelo admin e pela professora, leitura pela responsável, relatório "1 de 1 leram", arquivamento, regressão dos 4 formulários, celular)
- [x] ESLint sem avisos e build de produção do frontend OK

## Endpoints existentes

| Método | Rota              | Acesso                | Descrição |
| ------ | ----------------- | --------------------- | --------- |
| GET    | `/api/health`     | público               | `{ api, database, timestamp }`; 503 se o banco estiver fora |
| POST   | `/api/auth/login` | público, rate limited | body `{ email, senha }` → `{ token, tokenType, expiresIn, user }`. 400 validação, 401 credenciais, 403 usuário inativo, 429 excesso de tentativas |
| GET    | `/api/auth/me`    | autenticado           | `{ user }` do usuário logado |
| GET    | `/api/admin/ping` | ADMIN                 | Confirma acesso de admin (401 sem token, 403 outros perfis) |
| GET    | `/api/usuarios`   | ADMIN | Query `page`, `pageSize` (máx. 100), `busca`, `tipo`, `ativo` → `{ items, pagination: { page, pageSize, total, totalPages } }` |
| POST   | `/api/usuarios`   | ADMIN | `{ nome, email, senha, tipoUsuario, telefone?, cpf? }` → 201 `{ user }`. Telefone/CPF só para RESPONSAVEL. 409 e-mail/CPF repetido |
| GET    | `/api/usuarios/:id` | ADMIN | `{ user }` (com `responsavel: { telefone, cpf }` se for responsável). 404 se não existir/id inválido |
| PUT    | `/api/usuarios/:id` | ADMIN | `{ nome, email, telefone?, cpf? }`. Perfil é imutável (enviar `tipoUsuario` → 400) |
| PATCH  | `/api/usuarios/:id/ativo` | ADMIN | `{ ativo: boolean }`. Admin não pode desativar a si mesmo (400) |
| PATCH  | `/api/usuarios/:id/senha` | ADMIN | `{ senha }` (política: 8+ caracteres, letra e número) |
| GET    | `/api/alunos` | ADMIN | Query `page`, `pageSize`, `busca` (nome ou matrícula), `ativo` → `{ items, pagination }`; cada item tem `totalResponsaveis` |
| POST   | `/api/alunos` | ADMIN | `{ nome, dataNascimento: "AAAA-MM-DD", matricula }` → 201 `{ aluno }`. 409 matrícula repetida |
| GET    | `/api/alunos/:id` | ADMIN | `{ aluno }` com `responsaveis` (vínculos) incluídos |
| PUT    | `/api/alunos/:id` | ADMIN | Mesmo corpo do POST |
| PATCH  | `/api/alunos/:id/ativo` | ADMIN | `{ ativo: boolean }` |
| GET    | `/api/alunos/:id/responsaveis` | ADMIN | `{ responsaveis }` (principal primeiro) |
| POST   | `/api/alunos/:id/responsaveis` | ADMIN | `{ usuarioId, parentesco, responsavelPrincipal?, autorizadoReceberComunicacoes? }` → 201 `{ vinculo }`. Usuário precisa ser RESPONSAVEL ativo (400); repetido → 409 |
| PUT    | `/api/alunos/:id/responsaveis/:vinculoId` | ADMIN | `{ parentesco, responsavelPrincipal, autorizadoReceberComunicacoes }` |
| DELETE | `/api/alunos/:id/responsaveis/:vinculoId` | ADMIN | Remove só o vínculo (o usuário responsável continua existindo) |
| GET    | `/api/disciplinas` | ADMIN | Query `page`, `pageSize`, `busca`, `ativo` → `{ items, pagination }` |
| POST/PUT | `/api/disciplinas`, `/api/disciplinas/:id` | ADMIN | `{ nome, descricao? }`. 409 nome repetido (sem diferenciar maiúsculas) |
| GET    | `/api/disciplinas/:id` | ADMIN | `{ disciplina }` |
| PATCH  | `/api/disciplinas/:id/ativo` | ADMIN | `{ ativo }`. Desativada não recebe novas atribuições |
| GET    | `/api/turmas` | ADMIN | Query `page`, `pageSize`, `busca`, `anoLetivo`, `turno`, `ativo` → itens com `totalAlunos`, `totalProfessores` |
| POST/PUT | `/api/turmas`, `/api/turmas/:id` | ADMIN | `{ nome, anoLetivo (número), turno, descricao? }`. 409 nome repetido no ano+turno; 400 ao mudar o ano de turma com matrículas |
| GET    | `/api/turmas/:id` | ADMIN | `{ turma }` com `alunos` (matrículas ativas) e `professores` (atribuições) |
| PATCH  | `/api/turmas/:id/ativo` | ADMIN | `{ ativo }` |
| GET/POST | `/api/turmas/:id/alunos` | ADMIN | Lista / matricula `{ alunoId, transferir? }`. Aluno em outra turma do ano → 409 com `errors[0].field = "transferir"`; repetir com `transferir: true` |
| DELETE | `/api/turmas/:id/alunos/:alunoId` | ADMIN | Encerra a matrícula (`ativo = false`, histórico mantido) |
| GET/POST | `/api/turmas/:id/professores` | ADMIN | Lista / atribui `{ professorId, disciplinaId }` (professor e disciplina ativos; 409 repetido) |
| DELETE | `/api/turmas/:id/professores/:atribuicaoId` | ADMIN | Remove a atribuição |

O detalhe do aluno (`GET /api/alunos/:id`) também traz `turmas` (matrículas ativas).

| Método | Rota | Acesso | Descrição |
| ------ | ---- | ------ | --------- |
| GET    | `/api/avisos` | ADMIN, PROFESSOR | Query `page`, `pageSize`, `busca`, `publico`, `ativo`. Professor vê só os próprios. Itens com `totalDestinatarios` e `totalLidos` |
| POST   | `/api/avisos` | ADMIN, PROFESSOR | `{ titulo, conteudo, publico, turmaId?, alunoId? }` → 201. Professor: só `TURMA` em que leciona (403). Sem destinatários → 400 |
| GET    | `/api/avisos/:id` | ADMIN, PROFESSOR (próprio) | `{ aviso }` com `destinatarios: [{ usuario, lido, visualizadoEm }]` (não lidos primeiro) |
| PATCH  | `/api/avisos/:id/ativo` | ADMIN, PROFESSOR (próprio) | Arquivar/reativar |
| GET    | `/api/me/avisos` | RESPONSAVEL | Avisos ativos destinados ao usuário (`naoLidos=true` filtra) |
| GET    | `/api/me/avisos/:id` | RESPONSAVEL | Um aviso destinado ao usuário (404 se não for destinatário) |
| POST   | `/api/me/avisos/:id/visualizar` | RESPONSAVEL | Registra a leitura (idempotente: guarda a primeira) |
| GET    | `/api/me/turmas` | PROFESSOR | Turmas ativas em que leciona, com as disciplinas |

Formato de sucesso: `{ success: true, data: {...} }`. Formato de erro: `{ success: false, message, errors? }` (`errors` = lista `{ field, message }` em erros de validação).
Usuário na API sempre em camelCase: `{ id, nome, email, tipoUsuario, ativo, criadoEm, atualizadoEm }` — nunca contém senha/hash.

## Credenciais de desenvolvimento

**Somente para ambiente local.**

- E-mail: `admin@escolaavis.com`
- Senha: `Admin@123`
- Perfil: ADMIN

Banco local criado nesta máquina: role `escolaavis`, bancos `escolaavis` e `escolaavis_test` (a senha da role está apenas em `backend/.env`, que não é versionado).

## Pendências

Módulos (cada um precisa de backend + frontend + testes):
- [ ] Notas (nova migration)
- [ ] Ocorrências (nova migration)
- [ ] Mensagens (nova migration)
- [ ] Calendário escolar (nova migration)
- [ ] Integração BrasilAPI (ex.: CEP no cadastro, feriados no calendário)
- [ ] Relatórios
- [ ] Indicadores reais nos cards do dashboard (trocar "—" quando os endpoints existirem)

Melhorias técnicas conhecidas (não bloqueiam):
- [ ] Logout é só no cliente (JWT stateless). Se precisar invalidar tokens no servidor: tabela de tokens revogados ou campo `token_version` em `usuarios`.
- [ ] Rate limit em memória: com mais de uma instância do backend, trocar o store (ex.: Redis). (Atrás de proxy reverso basta configurar `TRUST_PROXY`.)
- [ ] Achados da revisão de código ainda não aplicados: `migrate:down` sem confirmação; `catch` vazio em `tokenStorage.get/clear`; estado "deslogado" repetido no `AuthProvider`; 404 repete estilos do `Button`.
- [ ] Alterar senha / "esqueci minha senha"
- [ ] Testes automatizados do frontend (Vitest + Testing Library)
- [ ] Buscas (usuários e alunos) não ignoram acentos ("joao" não acha "João"). Solução: extensão `unaccent` em uma migration.
- [ ] Item "Responsáveis" da sidebar continua "Em breve": hoje responsáveis são geridos em Usuários (perfil Responsável) + vínculos na tela do aluno. Decidir se vale uma tela própria (ex.: lista de responsáveis com seus alunos).
- [ ] Aluno sem nenhum responsável não tem alerta além do selo "Sem responsável" na lista.
- [ ] Ao salvar um registro, a lista volta sem os filtros que estavam aplicados.
- [ ] Professor tem só a tela de avisos; falta "Minhas turmas" (lista de alunos das turmas em que leciona). A API `/api/me/turmas` já existe.
- [ ] Responsável vinculado a um aluno DEPOIS da publicação não recebe avisos antigos (consequência do snapshot; decidir se precisa de "reenvio").
- [ ] Notificação fora do sistema (e-mail/push) quando um aviso é publicado.
- [ ] Anexos em avisos.
- [ ] Virada de ano letivo (encerrar matrículas do ano anterior em lote) não existe; hoje é turma a turma.
- [ ] Não existe exclusão definitiva de usuários (de propósito: desativar preserva o histórico).

## Próxima etapa

**Fase 6 — Ocorrências.** Registro de ocorrências sobre um aluno (disciplinar, saúde, elogio, atraso...) feito por professor ou administração, com **ciência do responsável** — reaproveita quase todo o mecanismo dos avisos.

Banco (nova migration):
1. `ocorrencias`: aluno_id, autor_id, tipo (CHECK: DISCIPLINAR | ATRASO | SAUDE | ELOGIO | OUTRO), descricao, data_ocorrencia, ativo, timestamps.
2. `ocorrencia_ciencias`: ocorrencia_id, usuario_id (responsável), ciente_em — snapshot dos responsáveis autorizados do aluno no registro (mesma regra de `aviso_destinatarios`).

Backend:
1. PROFESSOR registra só para alunos das turmas em que leciona; ADMIN para qualquer aluno ativo.
2. Responsável: `GET /api/me/ocorrencias` e `POST /api/me/ocorrencias/:id/ciencia` ("estou ciente", idempotente).
3. Reutilizar o SQL de destinatários de `avisoRepository.insertDestinatarios` (extrair para uma função comum que recebe a tabela/colunas ou o conjunto de alunos).

Frontend:
1. Liberar "Ocorrências" (ADMIN/PROFESSOR) e "Minhas ocorrências" (RESPONSAVEL); na tela do aluno, listar as ocorrências dele.
2. Card "Ocorrências" real no dashboard por perfil (mesmo padrão `live` por perfil).
3. Reaproveitar `ReadProgress`, `useEntityLoader`, `usePaginatedList`, `SearchPicker` (escolher aluno).

## Decisões técnicas

Registradas para que ninguém mude a arquitetura sem motivo. Para mudar, documente aqui o porquê.

1. **JavaScript + ESM (`"type": "module"`) nos dois lados.** Sem TypeScript por exigência do projeto.
2. **Camadas routes → controller → service → repository.** Controllers não têm SQL; services não conhecem `req/res`; repositories só fazem SQL.
3. **SQL puro com `pg` (sem ORM)** e sempre com parâmetros (`$1, $2`). Repositories nunca devolvem `senha_hash`, exceto `findByEmailWithPasswordHash` (uso exclusivo do login).
4. **Migrations em SQL com node-pg-migrate**, executadas via `src/database/migrate.js` para usar o mesmo `.env` da aplicação. Migration aplicada não se edita: cria-se outra.
5. **UUID como chave primária**: evita IDs sequenciais adivinháveis em URLs (dados de menores de idade).
6. **`tipo_usuario` como VARCHAR + CHECK (não ENUM)**: mais simples de evoluir. Manter `src/config/roles.js` igual à constraint.
7. **Coluna `senha_hash` (e não `senha`)** para deixar explícito que nunca é texto puro.
8. **E-mail normalizado (minúsculas) no app E garantido por CHECK no banco**, então o UNIQUE simples já é case-insensitive.
9. **Professor não tem tabela própria**: é um `usuario` com tipo PROFESSOR. Se precisar de dados extras, criar `professores` 1:1 como `responsaveis`.
10. **Aluno não tem login** nesta fase (não referencia `usuarios`).
11. **Regras "usuario_id precisa ser RESPONSAVEL" e "professor_id precisa ser PROFESSOR" ficam na camada de serviço** (FK não valida o tipo).
12. **Exclusão lógica (`ativo = false`) é o padrão** para entidades principais; FKs para `usuarios` e `disciplinas` são RESTRICT; tabelas de vínculo usam CASCADE.
13. **JWT HS256 com algoritmo fixado na verificação**; payload mínimo `{ sub, tipo_usuario }`. A autorização usa o perfil **lido do banco** a cada requisição (mudança de perfil/desativação vale na hora).
14. **Token no `localStorage` + header `Authorization: Bearer`.** Trade-off aceito: vulnerável se houver XSS (por isso React escapa tudo e não usamos `dangerouslySetInnerHTML`). Alternativa futura: cookie httpOnly + proteção CSRF.
15. **Mensagem de login genérica** ("E-mail ou senha inválidos.") e hash dummy quando o e-mail não existe. "Usuário inativo" (403) só é revelado após senha correta.
16. **Rate limit apenas no login**, contando só falhas (`skipSuccessfulRequests`).
17. **Testes usam um banco separado (`TEST_DATABASE_URL`) que é apagado e recriado** a cada arquivo de teste; o helper se recusa a rodar em banco cujo nome não termine com `_test`.
18. **`node:test` + supertest** em vez de Jest: zero configuração com ESM.
19. **Frontend com CSS Modules + tokens em `styles/global.css`** (sem framework de UI). Cores oficiais: primária `#2563EB`, escura `#1E3A8A`, fundo `#F8FAFC`, texto `#1E293B`, verde `#16A34A`, amarelo `#F59E0B`, vermelho `#DC2626`.
20. **Módulos não implementados aparecem desabilitados na sidebar** ("Em breve") e os cards mostram "—". Proibido exibir números fictícios.
21. **Porta do Vite fixa em 5173 (`strictPort`)**, pois precisa bater com `FRONTEND_URL` do CORS.
22. **Sistema não indexável** (`robots.txt` + meta `noindex`): é privado e lida com dados de menores. Se um dia houver site institucional público, ele deve ser um projeto/rota separado com regras próprias de SEO.
23. **Checklist de UX usado como referência** (404, CTAs claros, URLs legíveis, breadcrumbs, FAQ, cases, página de obrigado, CTA fixo no mobile, robots.txt). No sistema logado se aplicam: 404, CTAs, URLs, breadcrumbs (a partir da Fase 2) e robots. Cases, obrigado, FAQ e CTA fixo valem apenas para um eventual site público.
24. **Expiração da sessão no frontend usa o relógio local**, nunca o `exp` do JWT: PCs com data/hora errada derrubariam sessões válidas (ou manteriam vencidas). Quem decide se o token vale é sempre o backend.
25. **Node 22.12+ obrigatório** (`engines` nos dois `package.json`, `.nvmrc`): o `npm test` usa glob no `node --test` (Node 21+) e o Vite 8 exige 20.19+/22.12+.
26. **`TRUST_PROXY` explícito e `true` proibido**: o rate limit usa `req.ip`; confiar em qualquer `X-Forwarded-For` permitiria burlar o limite forjando o IP.
27. **Testes fixam suas próprias variáveis** (`tests/setup.js`: rate limit, expiração, proxy) para não dependerem do `.env` de cada desenvolvedor.
28. **Repositório Git próprio em `escola-avisa/`.** A pasta-mãe (`C:\Users\wills`) também é um repositório Git; o repo aninhado evita misturar históricos.
29. **Nomes do domínio em português** (`usuario`, `aluno`, `senhaHash`, `usuarioRepository.js`): exceção à regra "nomes em inglês" do CLAUDE.md do usuário, decidida por ele em 2026-11-04. Os termos espelham o banco e a API definidos em português; código técnico/genérico (`withTransaction`, `isUuid`, `Button`) continua em inglês.
30. **Perfil (`tipo_usuario`) é imutável depois da criação**: trocar perfil deixaria dados órfãos (`responsaveis`, `professor_turma`). Para mudar, desative e crie outro usuário.
31. **Escritas em mais de uma tabela usam `withTransaction`**; os repositories recebem o `client` como último parâmetro (`db = pool`).
32. **Erros de UNIQUE conhecidos viram 409 com mensagem e campo específicos** no service (`rethrowAsConflict`), em vez da mensagem genérica do errorHandler.
33. **Id malformado em rota `/:id` responde 404** (não 400): para o cliente, "não existe" é a mesma coisa.
34. **Padrão de listagem**: query `page`/`pageSize` (padrão 20, máx. 100), resposta `{ items, pagination }`, ordem estável (`nome, id`). No frontend, filtros na URL (`useSearchParams`) e busca com debounce de 350 ms. Reutilizar nos próximos CRUDs.
35. **Admin não pode desativar a si mesmo**: garante que sempre exista pelo menos um admin ativo.
36. **CPF e telefone trafegam e são gravados só com dígitos**; a máscara existe apenas na interface.
37. **Mensagens sobre pessoas usam frases neutras** ("Acesso de Maria desativado"), sem presumir gênero pelo nome.
38. **Vínculo aluno ↔ responsável é feito pelo `usuarioId`** (o que o admin escolhe na busca de usuários); o backend garante o registro em `responsaveis` (`ensureForUsuario`). Só usuários RESPONSAVEL **ativos** podem ser vinculados.
39. **Um único responsável principal por aluno**: marcar outro como principal desmarca o anterior na mesma transação (`clearPrincipal`); o índice único parcial do banco é a última barreira.
40. **Matrícula é gravada em maiúsculas** (aceita letras, números, `.`, `/`, `-`), evitando duplicatas que só diferem na caixa.
41. **Datas sem horário (ex.: `data_nascimento`) trafegam como string `AAAA-MM-DD`** (parser do `pg` em `pool.js`) e são formatadas no frontend sem `new Date()` (`formatDateOnly`), para não "voltar um dia" por causa do fuso.
42. **Após cadastrar um aluno, a tela vai para a edição dele**, onde ficam os vínculos (o aluno precisa existir antes de vincular).
43. **Remover vínculo é exclusão definitiva só da linha de `aluno_responsavel`**; alunos e usuários continuam com exclusão lógica (`ativo`).
44. **Listagens e formulários reutilizam** `usePaginatedList`, `useFlashMessage`, `styles/ListPage.module.css` e `styles/FormPage.module.css`. Não copiar esses trechos em novas páginas.
45. **Matrícula = linha em `aluno_turma`; transferir/encerrar só desativa (`ativo = false`)**, preservando o histórico. Voltar para uma turma anterior reativa a mesma linha (UNIQUE aluno_id+turma_id).
46. **Transferência exige confirmação explícita**: a API responde 409 com `errors[0].field = "transferir"` e a tela pergunta antes de repetir com `transferir: true`; a troca acontece em uma transação.
47. **Ano letivo da turma não muda depois de qualquer matrícula** (a FK `ON UPDATE CASCADE` moveria o histórico sem ninguém perceber). Para outro ano, cria-se outra turma.
48. **Só registros ativos entram em novos vínculos** (aluno ativo na matrícula; professor e disciplina ativos na atribuição; turma ativa para qualquer alteração). Desativar não apaga vínculos existentes.
49. **Componentes de listagem/relacionamento são compartilhados**: `SearchPicker`, `RowActions`, `useAtivoToggle`, `styles/RelationSection.module.css`, além dos já citados na decisão 44. Novas telas devem usá-los.
50. **Helpers de backend compartilhados**: `containsPattern` (busca), `toPagination`, `rethrowUniqueAsConflict`, `optionalTextSchema`. Repositories/services novos devem usá-los em vez de reescrever.
51. **Destinatários de aviso são gravados na publicação (snapshot em `aviso_destinatarios`)**, não calculados na leitura: o relatório "lido por X de Y" fica estável e auditável mesmo se alunos mudarem de turma. Consequência aceita: quem for vinculado depois não recebe avisos antigos.
52. **Quem recebe**: usuários RESPONSAVEL ativos, com vínculo `autorizado_receber_comunicacoes`, de alunos ativos do público (TODOS = todos os alunos ativos; TURMA = matrícula ativa na turma; ALUNO = o aluno). Publicação com zero destinatários é recusada (400) e desfeita na transação.
53. **Aviso publicado não é editado**: funciona como mensagem enviada (alguém pode já ter lido). Corrigir = arquivar (`ativo = false`, some para o responsável, mantém histórico) e publicar outro.
54. **Leitura é registrada ao abrir o aviso** (`POST /me/avisos/:id/visualizar`, idempotente com `COALESCE`): a primeira leitura nunca é sobrescrita.
55. **Professor publica só para turmas em que leciona** e só vê/arquiva os próprios avisos (aviso de outro autor responde 404, sem revelar que existe).
56. **Rotas `/api/me/*`** usam sempre `req.user` (nunca id na URL para identificar o usuário) e são autorizadas por perfil.
57. **Cards do dashboard definem `live` por perfil** (`live: { ADMIN: {...}, RESPONSAVEL: {...} }`); perfil sem `live` vê o card como "Restrito" (se o módulo existe) ou "Em breve".
