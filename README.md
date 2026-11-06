# EscolaAvis

[![CI](https://github.com/willsolarevicz-oss/EscolaAvisa/actions/workflows/ci.yml/badge.svg)](https://github.com/willsolarevicz-oss/EscolaAvisa/actions/workflows/ci.yml)

Sistema web de comunicação entre a escola e os responsáveis pelos alunos.

> **Status:** Fases 1 a 16 concluídas — infraestrutura, autenticação e perfis, gestão de usuários, alunos e responsáveis, turmas e disciplinas, **avisos com controle de leitura**, **ocorrências com ciência do responsável**, **notas com boletim**, **calendário escolar com feriados nacionais (BrasilAPI)**, **mensagens entre responsáveis e escola** , **dashboard com indicadores reais e contadores na sidebar**, **CI no GitHub Actions** , **relatórios** (leitura de avisos, ocorrências e notas) , **ajustes de qualidade** (busca sem acento, filtros mantidos, "Minhas turmas" do professor) , **testes automatizados também no frontend** , **tela de Responsáveis** (com alerta de alunos sem responsável) e **segurança reforçada** (auditoria, rate limit geral, CSP, CodeQL, Dependabot — ver [SECURITY.md](SECURITY.md)).
> Detalhes do que está pronto e do que falta: [PROGRESSO.md](PROGRESSO.md).

| Camada   | Tecnologias                                                                 |
| -------- | --------------------------------------------------------------------------- |
| Frontend | React 19, Vite, JavaScript, React Router, Axios, CSS Modules                |
| Backend  | Node.js, Express 5, PostgreSQL (`pg`), node-pg-migrate                      |
| Segurança| JWT, bcrypt, Helmet, CORS, express-rate-limit, validação com zod            |

```
escola-avisa/
├── backend/     API REST (Express + PostgreSQL)
├── frontend/    SPA (React + Vite)
├── README.md
└── PROGRESSO.md memória do desenvolvimento (leia antes de continuar o projeto)
```

---

## 1. Requisitos

- **Node.js 22.12+** e npm (o `npm test` usa recursos do test runner que não existem no Node 20)
- **PostgreSQL 14+** (desenvolvido com PostgreSQL 17)
- Git

## 2. PostgreSQL

O projeto precisa de um PostgreSQL rodando (local ou remoto). Não há banco em memória.

## 3. Criação do banco

Crie um usuário e dois bancos: um para desenvolvimento e outro **só para os testes automatizados** (os testes apagam e recriam esse banco; o nome precisa terminar com `_test`).

Abra o `psql` como superusuário (ex.: `psql -U postgres`) e execute — **troque a senha**:

```sql
CREATE ROLE escolaavis LOGIN PASSWORD 'troque_esta_senha';
CREATE DATABASE escolaavis OWNER escolaavis;
CREATE DATABASE escolaavis_test OWNER escolaavis;
```

> No Windows, o `psql` costuma ficar em `C:\Program Files\PostgreSQL\<versão>\bin\psql.exe`.

## 4. Backend

```bash
cd backend
npm install
cp .env.example .env      # no Windows (PowerShell): Copy-Item .env.example .env
```

Edite `backend/.env` (veja a seção 6), depois:

```bash
npm run migrate   # cria as tabelas
npm run seed      # cria o administrador de desenvolvimento
npm run dev       # inicia a API em http://localhost:3333/api
```

## 5. Frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env      # no Windows (PowerShell): Copy-Item .env.example .env
npm run dev               # abre em http://localhost:5173
```

## 6. Variáveis de ambiente

### `backend/.env`

| Variável                          | Obrigatória | Descrição                                                                      |
| --------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `NODE_ENV`                        | não         | `development` (padrão), `test` ou `production`                                  |
| `PORT`                            | não         | Porta da API (padrão `3333`)                                                    |
| `DATABASE_URL`                    | **sim**     | `postgres://usuario:senha@host:5432/escolaavis`                                 |
| `TEST_DATABASE_URL`               | para testes | Banco usado pelo `npm test`. **O nome deve terminar com `_test`**               |
| `JWT_SECRET`                      | **sim**     | Segredo do JWT, **mínimo 32 caracteres aleatórios**                             |
| `JWT_EXPIRES_IN`                  | não         | Validade do token: número + unidade `s`/`m`/`h`/`d` (padrão `8h`). Número sem unidade é recusado |
| `FRONTEND_URL`                    | não         | Origem(ns) liberadas no CORS, separadas por vírgula (padrão `http://localhost:5173`) |
| `AUTH_RATE_LIMIT_MAX`             | não         | Tentativas de login com falha por IP na janela (padrão `10`)                    |
| `AUTH_RATE_LIMIT_WINDOW_MINUTES`  | não         | Janela do rate limit em minutos (padrão `15`)                                   |
| `API_RATE_LIMIT_MAX`              | não         | Requisições por IP na janela, em toda a `/api` (padrão `300`)                   |
| `API_RATE_LIMIT_WINDOW_MINUTES`   | não         | Janela do limite geral, em minutos (padrão `1`)                                 |
| `TRUST_PROXY`                     | em produção atrás de proxy | Nº de proxies reversos na frente da API (padrão `false`). **Obrigatório configurar atrás de Nginx/load balancer**, senão todos os usuários dividem o mesmo limite de login. `true` é recusado por segurança |
| `BRASILAPI_URL`                   | não         | Base da BrasilAPI para os feriados do calendário (padrão `https://brasilapi.com.br/api`). Pública, sem chave |
| `BRASILAPI_TIMEOUT_MS`            | não         | Tempo máximo da consulta de feriados (padrão `3000`). Se estourar, o calendário funciona sem os feriados |
| `SEED_ADMIN_PASSWORD`             | em produção | Senha do admin criado pelo seed. Em desenvolvimento, se vazio, usa `Admin@123` |

Gere um `JWT_SECRET` seguro com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

A API **não inicia** se `DATABASE_URL` ou `JWT_SECRET` estiverem ausentes, se o segredo for curto demais, ou se `JWT_EXPIRES_IN`/`TRUST_PROXY` tiverem formato inválido.

### `frontend/.env`

| Variável       | Descrição                                            |
| -------------- | ---------------------------------------------------- |
| `VITE_API_URL` | URL base da API (padrão `http://localhost:3333/api`) |

> Os arquivos `.env` estão no `.gitignore`. Apenas os `.env.example` vão para o Git.

## 7. Migrations

As tabelas são criadas por migrations SQL em `backend/migrations/` (biblioteca [node-pg-migrate](https://salsita.github.io/node-pg-migrate/)). Cada arquivo tem uma seção `-- Up Migration` e outra `-- Down Migration`.

```bash
npm run migrate                       # aplica todas as pendentes
npm run migrate:down                  # desfaz a última (pede para digitar "sim"; em script use: npm run migrate:down -- --yes)
npm run migrate:create -- nome-da-mudanca   # cria um novo arquivo .sql
```

**Nunca edite uma migration que já foi aplicada**: crie uma nova.

## 8. Seed

```bash
npm run seed
```

Cria o administrador inicial. É **idempotente**: se o e-mail já existir, nada é alterado (nem a senha).

## 9. Como iniciar (resumo)

```bash
# terminal 1
cd backend && npm run dev
# terminal 2
cd frontend && npm run dev
```

Acesse http://localhost:5173 e entre com as credenciais abaixo.

## 10. Credenciais de desenvolvimento

| Campo  | Valor                      |
| ------ | -------------------------- |
| E-mail | `admin@escolaavis.com`     |
| Senha  | `Admin@123`                |
| Perfil | ADMIN                      |

> ⚠️ **ATENÇÃO: esta senha é EXCLUSIVA para ambiente de desenvolvimento local.**
> Ela é pública (está neste README). **Nunca** use em produção ou em qualquer ambiente acessível pela internet.
> Em produção, o seed se recusa a rodar sem `SEED_ADMIN_PASSWORD` definida. A senha é armazenada apenas como hash bcrypt.

## 11. URLs

| O quê               | URL                                   |
| ------------------- | ------------------------------------- |
| Frontend            | http://localhost:5173                 |
| API (base)          | http://localhost:3333/api             |
| Health check        | http://localhost:3333/api/health      |

### Endpoints atuais

| Método | Rota               | Acesso        | Descrição                                       |
| ------ | ------------------ | ------------- | ----------------------------------------------- |
| GET    | `/api/health`      | público       | Status da API e da conexão com o PostgreSQL     |
| POST   | `/api/auth/login`  | público (rate limit) | Login: `{ "email", "senha" }` → token JWT + usuário |
| GET    | `/api/auth/me`     | autenticado   | Dados do usuário logado                         |
| GET    | `/api/admin/ping`  | somente ADMIN | Verificação do controle de acesso (RBAC)        |
| GET    | `/api/usuarios`    | somente ADMIN | Lista paginada (`page`, `pageSize`, `busca`, `tipo`, `ativo`) |
| POST   | `/api/usuarios`    | somente ADMIN | Cria usuário (responsável pode ter telefone/CPF) |
| GET    | `/api/usuarios/:id` | somente ADMIN | Detalhe do usuário                             |
| PUT    | `/api/usuarios/:id` | somente ADMIN | Edita nome, e-mail, telefone/CPF (perfil é imutável) |
| PATCH  | `/api/usuarios/:id/ativo` | somente ADMIN | Ativa/desativa (`{ "ativo": true/false }`) |
| PATCH  | `/api/usuarios/:id/senha` | somente ADMIN | Redefine a senha (8+ caracteres, letra e número) |
| GET    | `/api/alunos`      | somente ADMIN | Lista paginada (`page`, `pageSize`, `busca`, `ativo`) |
| POST   | `/api/alunos`      | somente ADMIN | Cadastra aluno (`nome`, `dataNascimento` AAAA-MM-DD, `matricula`) |
| GET    | `/api/alunos/:id`  | somente ADMIN | Detalhe do aluno com os responsáveis vinculados |
| PUT    | `/api/alunos/:id`  | somente ADMIN | Edita os dados do aluno                         |
| PATCH  | `/api/alunos/:id/ativo` | somente ADMIN | Ativa/desativa                              |
| GET/POST | `/api/alunos/:id/responsaveis` | somente ADMIN | Lista / vincula responsável (`usuarioId`, `parentesco`, principal, autorizado) |
| PUT/DELETE | `/api/alunos/:id/responsaveis/:vinculoId` | somente ADMIN | Edita / remove o vínculo |
| GET/POST | `/api/disciplinas` | somente ADMIN | Lista paginada / cadastra (`nome`, `descricao`) |
| GET/PUT | `/api/disciplinas/:id` | somente ADMIN | Detalhe / edita                                |
| PATCH  | `/api/disciplinas/:id/ativo` | somente ADMIN | Ativa/desativa                             |
| GET/POST | `/api/turmas`    | somente ADMIN | Lista (`busca`, `anoLetivo`, `turno`, `ativo`) / cadastra (`nome`, `anoLetivo`, `turno`, `descricao`) |
| GET/PUT | `/api/turmas/:id` | somente ADMIN | Detalhe com alunos e professores / edita       |
| PATCH  | `/api/turmas/:id/ativo` | somente ADMIN | Ativa/desativa                                  |
| GET/POST | `/api/turmas/:id/alunos` | somente ADMIN | Lista / matricula (`alunoId`, `transferir`) |
| DELETE | `/api/turmas/:id/alunos/:alunoId` | somente ADMIN | Encerra a matrícula (histórico mantido) |
| GET/POST | `/api/turmas/:id/professores` | somente ADMIN | Lista / atribui (`professorId`, `disciplinaId`) |
| DELETE | `/api/turmas/:id/professores/:atribuicaoId` | somente ADMIN | Remove a atribuição |
| GET/POST | `/api/avisos`    | ADMIN, PROFESSOR | Lista (com contagem de leituras) / publica (`titulo`, `conteudo`, `publico`, `turmaId`/`alunoId`) |
| GET    | `/api/avisos/:id`  | ADMIN, PROFESSOR | Detalhe com quem leu e quem não leu         |
| PATCH  | `/api/avisos/:id/ativo` | ADMIN, PROFESSOR | Arquivar / reativar                         |
| GET    | `/api/me/avisos`   | RESPONSAVEL   | Avisos recebidos (`naoLidos=true` filtra)         |
| GET    | `/api/me/avisos/:id` | RESPONSAVEL | Um aviso recebido                                 |
| POST   | `/api/me/avisos/:id/visualizar` | RESPONSAVEL | Registra a leitura                  |
| GET    | `/api/me/turmas`   | PROFESSOR     | Turmas em que o professor leciona                 |
| GET    | `/api/me/turmas/:turmaId/alunos` | PROFESSOR | Alunos da turma (e se a família pode receber comunicações) |
| GET    | `/api/responsaveis` | ADMIN | Responsáveis com seus alunos (`busca`, `ativo`, `semAluno`) |
| GET    | `/api/responsaveis/pendencias` | ADMIN | Alunos ativos sem responsável que receba comunicações |
| GET    | `/api/auditoria` | ADMIN | Trilha de quem alterou o quê (`busca`, `falhas=true`) |
| GET/POST | `/api/ocorrencias` | ADMIN, PROFESSOR | Lista (com contagem de ciências) / registra (`alunoId`, `tipo`, `descricao`, `dataOcorrencia`) |
| GET    | `/api/ocorrencias/:id` | ADMIN, PROFESSOR | Detalhe com quem deu ciência                 |
| PATCH  | `/api/ocorrencias/:id/ativo` | ADMIN, PROFESSOR | Arquivar / reativar                    |
| GET    | `/api/me/ocorrencias` | RESPONSAVEL | Ocorrências dos seus alunos (`pendentes=true` filtra) |
| GET    | `/api/me/ocorrencias/:id` | RESPONSAVEL | Uma ocorrência                              |
| POST   | `/api/me/ocorrencias/:id/ciencia` | RESPONSAVEL | "Estou ciente"                      |
| GET    | `/api/me/alunos`   | PROFESSOR     | Alunos das turmas do professor (`busca`)          |
| GET    | `/api/notas/turmas` | ADMIN, PROFESSOR | Turmas com as disciplinas lecionadas (professor: só as dele) |
| GET/PUT | `/api/notas/turmas/:turmaId/disciplinas/:disciplinaId` | ADMIN, PROFESSOR (atribuído) | Grade de notas / lança em lote (`{ notas: [{ alunoId, bimestre, valor \| null }] }`, null apaga) |
| GET    | `/api/me/boletim`  | RESPONSAVEL   | Notas e média por disciplina dos seus alunos      |
| GET    | `/api/calendario?mes=AAAA-MM` | todos | Eventos visíveis ao usuário + feriados nacionais do mês (BrasilAPI) |
| POST   | `/api/eventos`     | ADMIN, PROFESSOR | Cria evento (professor: só para turma em que leciona) |
| GET/PUT/DELETE | `/api/eventos/:id` | ADMIN, PROFESSOR (autor) | Carrega / edita / exclui evento |
| GET/POST | `/api/conversas` | todos | Lista as conversas do usuário (`naoLidas=true`) / inicia conversa com a 1ª mensagem |
| GET    | `/api/conversas/contatos` | todos | Com quem o usuário pode iniciar conversa |
| GET    | `/api/conversas/:id` | participante | Conversa com as mensagens                   |
| POST   | `/api/conversas/:id/mensagens` | participante | Envia mensagem                       |
| POST   | `/api/conversas/:id/lida` | participante | Marca a conversa como lida                |
| GET    | `/api/me/contadores` | todos | Números da sidebar (mensagens novas; avisos/ocorrências pendentes do responsável) |
| GET    | `/api/calendario/proximos` | todos | Próximos eventos (`limite`, padrão 5) + próximo feriado nacional |
| GET    | `/api/relatorios/avisos` | ADMIN, PROFESSOR | Leitura de avisos no período (`inicio`, `fim`; padrão 1º/jan–hoje) |
| GET    | `/api/relatorios/ocorrencias` | ADMIN, PROFESSOR | Ocorrências no período: por tipo, por turma, alunos com mais |
| GET    | `/api/relatorios/notas` | ADMIN, PROFESSOR | Médias por disciplina/bimestre da turma e alunos abaixo da nota de corte |

Rotas autenticadas exigem o cabeçalho `Authorization: Bearer <token>`.
Erros seguem o formato `{ "success": false, "message": "..." }`.

## 12. Scripts disponíveis

### Backend (`cd backend`)

| Script                    | O que faz                                                        |
| ------------------------- | ---------------------------------------------------------------- |
| `npm run dev`             | Inicia a API com reinício automático ao salvar (`node --watch`)  |
| `npm start`               | Inicia a API (modo normal)                                       |
| `npm run migrate`         | Aplica as migrations pendentes                                   |
| `npm run migrate:down`    | Desfaz a última migration (pede confirmação; `-- --yes` em script) |
| `npm run migrate:create`  | Cria um novo arquivo de migration SQL                            |
| `npm run seed`            | Cria o administrador inicial                                     |
| `npm test`                | Testes automatizados (usa `TEST_DATABASE_URL`, recria o banco de teste) |

### Frontend (`cd frontend`)

| Script            | O que faz                                    |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Servidor de desenvolvimento (porta 5173)     |
| `npm run build`   | Build de produção em `frontend/dist`         |
| `npm run preview` | Serve o build localmente (porta 4173)        |
| `npm run lint`    | ESLint                                       |
| `npm test`        | Testes do frontend (Vitest + Testing Library; API simulada, não precisa do backend) |
| `npm run test:watch` | Testes em modo observação (roda de novo ao salvar) |

### Integração contínua (GitHub Actions)

Todo PR e todo push na `main` rodam `.github/workflows/ci.yml` em máquinas limpas do GitHub:

- **Backend:** `npm ci` + `npm audit` (alta/crítica) + `npm test` contra um PostgreSQL 17 descartável (service container). O `JWT_SECRET` é gerado a cada execução; nenhum segredo fica no repositório.
- **Frontend:** `npm ci` + `npm audit` (alta/crítica) + `npm run lint` + `npm test` + `npm run build`.
- **CodeQL** (`codeql.yml`): análise estática de segurança em todo PR, push na `main` e toda segunda-feira.
- **Dependabot** (`dependabot.yml`): PRs semanais de atualização de dependências.

O resultado aparece no PR (✅/❌) e no selo do topo deste README. Para reproduzir localmente, rode os mesmos comandos numa cópia sem `.env` e sem `node_modules`.

## Problemas comuns

- **`Variável de ambiente obrigatória ausente`** → falta criar/preencher `backend/.env`.
- **`Não foi possível conectar ao PostgreSQL`** → PostgreSQL parado ou `DATABASE_URL` errada.
- **Login no frontend diz "Não foi possível conectar ao servidor"** → backend não está rodando ou `VITE_API_URL` errada.
- **Erro de CORS no navegador** → a origem do frontend não está em `FRONTEND_URL`.
- **`Port 5173 is already in use`** → outra instância do Vite está aberta (a porta é fixa por causa do CORS).
