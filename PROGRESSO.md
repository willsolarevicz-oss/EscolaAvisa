# PROGRESSO — EscolaAvis

> Memória persistente do desenvolvimento. **Leia inteiro antes de mexer no projeto** e atualize ao final de cada sessão.
> Última atualização: 2026-10-27 — fim da Fase 1.

---

## Sistema

O **EscolaAvis** é um sistema web de comunicação entre a escola e os responsáveis pelos alunos. Na versão completa terá: administradores, professores, responsáveis, alunos, turmas, disciplinas, notas, avisos, ocorrências, mensagens, calendário escolar, integração com a BrasilAPI e controle de visualização de comunicados.

## Tecnologias

| Camada    | Stack                                                                                     |
| --------- | ----------------------------------------------------------------------------------------- |
| Frontend  | React 19 + Vite 8, JavaScript, React Router 7 (`react-router`), Axios, CSS Modules, lucide-react (ícones), fonte Inter (`@fontsource-variable/inter`) |
| Backend   | Node.js (ESM, testado no 22), Express 5, `pg`, node-pg-migrate 9 (migrations em SQL), zod |
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
│       ├── config/          env.js (lê e VALIDA o .env), roles.js (perfis)
│       ├── database/        pool.js (pg Pool + query parametrizada), migrate.js (CLI/programático)
│       ├── repositories/    SQL puro, um arquivo por tabela/agregado
│       ├── services/        regras de negócio (não conhecem req/res)
│       ├── controllers/     traduzem HTTP <-> service
│       ├── validators/      schemas zod dos bodies
│       ├── middlewares/     authenticate, authorize, validateBody, rate limit, errorHandler
│       ├── routes/          index.js agrega tudo sob /api
│       ├── utils/           AppError, jwt, password, serializers
│       ├── app.js           monta o Express (sem listen; usado pelos testes)
│       └── server.js        checa o banco, faz listen e shutdown gracioso
└── frontend/
    └── src/
        ├── config/          navigation.js (itens da sidebar e quais estão disponíveis)
        ├── contexts/        authContext.js (contexto + status) e AuthProvider.jsx (lógica da sessão)
        ├── hooks/           useAuth, useApiHealth
        ├── services/        api.js (Axios central + interceptors), authService, healthService
        ├── routes/          AppRoutes, ProtectedRoute, PublicOnlyRoute
        ├── layouts/         DashboardLayout (sidebar + header + <Outlet/>)
        ├── components/      Logo, Button, TextField, Alert, Sidebar, Header, FullScreenStatus
        ├── pages/           LoginPage, DashboardPage, NotFoundPage
        ├── utils/           tokenStorage, jwt (decode sem validar), formatters
        └── styles/          global.css (design tokens em variáveis CSS)
```

**Fluxo de uma requisição:** `routes → middlewares (authenticate/authorize/validateBody) → controller → service → repository → PostgreSQL`. Erros sobem para o `errorHandler` central.

**Fluxo de autenticação no frontend:**
1. `AuthProvider` lê o token do `localStorage`. Se existir e não estiver expirado (campo `exp`), status = `checking` e chama `GET /auth/me`.
2. 200 → `authenticated`. 401 → limpa sessão e vai para `/login` com aviso. Servidor fora → tela "Não foi possível conectar" com "Tentar novamente" (o token **não** é apagado).
3. Qualquer 401 em outra chamada (interceptor do Axios) encerra a sessão. Exceção: o próprio login (`skipAuthHandler`).
4. Um timer encerra a sessão no horário exato de expiração do token.
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
| `pgmigrations`      | controle interno do node-pg-migrate                                                                  | — |

Relacionamentos:
- `usuarios 1 — 0..1 responsaveis`
- `alunos N — N responsaveis` (via `aluno_responsavel`)
- `alunos N — N turmas` (via `aluno_turma`, histórico por ano letivo)
- `usuarios(PROFESSOR) N — N turmas × disciplinas` (via `professor_turma`)

Migrations (em ordem): `1793059200000_funcao-atualizado-em`, `1793059201000_criar-usuarios`, `1793059202000_criar-alunos-e-responsaveis`, `1793059203000_criar-turmas-e-disciplinas`.

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
- [x] Frontend: login (validação, mostrar/ocultar senha, loading, erros amigáveis), sessão persistente, rotas protegidas, dashboard inicial, logout, 404
- [x] Sidebar com todos os módulos futuros (desabilitados com "Em breve"), gaveta em tablet/celular (fecha com Esc/clique fora)
- [x] Dashboard sem números falsos ("—" + "Em breve"); painel de status com dados reais do `/api/health`
- [x] **Testes automatizados: 42 passando** (`npm test` no backend): health, login, /me, tokens inválidos/expirados/forjados, RBAC, rate limit, constraints do banco
- [x] Teste manual no navegador: login, erro de senha, persistência após reload, logout, redirecionamento, token inválido/expirado, desktop/tablet/celular
- [x] ESLint sem avisos e build de produção do frontend OK

## Endpoints existentes

| Método | Rota              | Acesso                | Descrição |
| ------ | ----------------- | --------------------- | --------- |
| GET    | `/api/health`     | público               | `{ api, database, timestamp }`; 503 se o banco estiver fora |
| POST   | `/api/auth/login` | público, rate limited | body `{ email, senha }` → `{ token, tokenType, expiresIn, user }`. 400 validação, 401 credenciais, 403 usuário inativo, 429 excesso de tentativas |
| GET    | `/api/auth/me`    | autenticado           | `{ user }` do usuário logado |
| GET    | `/api/admin/ping` | ADMIN                 | Confirma acesso de admin (401 sem token, 403 outros perfis) |

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
- [ ] CRUD de usuários (ADMIN): criar professor/responsável, ativar/desativar, redefinir senha
- [ ] CRUD de alunos
- [ ] CRUD de responsáveis + vínculo aluno ↔ responsável
- [ ] CRUD de turmas e disciplinas + matrícula aluno ↔ turma + atribuição professor ↔ turma/disciplina
- [ ] Notas (nova migration)
- [ ] Avisos/comunicados + controle de visualização (nova migration)
- [ ] Ocorrências (nova migration)
- [ ] Mensagens (nova migration)
- [ ] Calendário escolar (nova migration)
- [ ] Integração BrasilAPI (ex.: CEP no cadastro, feriados no calendário)
- [ ] Relatórios
- [ ] Indicadores reais nos cards do dashboard (trocar "—" quando os endpoints existirem)

Melhorias técnicas conhecidas (não bloqueiam):
- [ ] Logout é só no cliente (JWT stateless). Se precisar invalidar tokens no servidor: tabela de tokens revogados ou campo `token_version` em `usuarios`.
- [ ] Rate limit em memória: com mais de uma instância do backend, trocar o store (ex.: Redis). Atrás de proxy reverso, configurar `app.set('trust proxy', ...)`.
- [ ] Alterar senha / "esqueci minha senha"
- [ ] Testes automatizados do frontend (Vitest + Testing Library)
- [ ] Paginação/filtros padrão para as listagens (definir no primeiro CRUD e reutilizar)

## Próxima etapa

**Fase 2 — Gestão de usuários (somente ADMIN).** É a base para todos os outros módulos, pois professores e responsáveis precisam existir antes de turmas, vínculos e comunicados.

Backend:
1. `usuarioRepository`: `list({ page, pageSize, busca, tipo, ativo })`, `update`, `setAtivo`, `updatePassword`.
2. `usuarioService`: criar usuário (hash bcrypt, e-mail normalizado, conflito → 409), editar, ativar/desativar (impedir que o admin desative a si mesmo), redefinir senha.
3. Ao criar um RESPONSAVEL, criar o registro em `responsaveis` **na mesma transação** (usar `pool.connect()` + `BEGIN/COMMIT`).
4. Rotas em `/api/usuarios` com `authenticate, authorize(ROLES.ADMIN)` e validação zod (política de senha mínima: 8+ caracteres, letra e número).
5. Testes em `backend/tests/usuarios.test.js` no mesmo padrão dos existentes.

Frontend:
1. Página `/usuarios` (listagem com busca, filtro por perfil, paginação) dentro do `DashboardLayout`.
2. Formulário de criação/edição (modal ou página) e ação de ativar/desativar.
3. Em `config/navigation.js`: `to: '/usuarios'`, `available: true` e a rota em `AppRoutes.jsx`.
4. Criar uma rota protegida por perfil no frontend (ex.: `ProtectedRoute` com `allowedRoles`) — apenas UX; o backend continua sendo quem autoriza.

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
22. **Repositório Git próprio em `escola-avisa/`.** A pasta-mãe (`C:\Users\wills`) também é um repositório Git; o repo aninhado evita misturar históricos.
