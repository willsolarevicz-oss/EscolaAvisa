# EscolaAvisa

Sistema de comunicação escola-responsáveis (Tema 08 — Projeto Integrador,
Desenvolvimento de Sistemas para Web/Mobile IV, Engenharia de Software —
UGV). A escola cadastra turmas, alunos e responsáveis, registra avisos,
notas e ocorrências, e o sistema notifica os responsáveis vinculados via
bot do Discord.

Requisitos completos em [docs/REQUISITOS.md](docs/REQUISITOS.md).
Design técnico da Fase 1 em
[docs/superpowers/specs/2026-08-24-escolaavisa-fase1-design.md](docs/superpowers/specs/2026-08-24-escolaavisa-fase1-design.md).

## Equipe
- Luis Guilherme Frankio
- Will Solarevicz

## Rodando localmente

```bash
cp .env.example .env
docker compose up
```

API disponível em `http://localhost:8000/health`.

Rodar as migrations (Alembic):

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m alembic upgrade head
```

Rodar os testes:

```bash
.venv/Scripts/python -m pytest
```

## Estrutura

```
src/            código da API (FastAPI)
db/migrations/  migrations versionadas do banco (Alembic)
docs/           documentos do projeto
tests/          testes automatizados
```

## Integração com Discord

O bot recebe interações (slash commands, cliques de botão) via **Interactions
Endpoint HTTP** — o Discord chama `POST /webhook/discord` e a assinatura
Ed25519 de cada requisição é validada com `DISCORD_PUBLIC_KEY`. O envio de
mensagens (avisos, confirmações) usa a API REST do Discord com
`DISCORD_TOKEN`.

**Vínculo (opt-in) de um responsável:**
1. `POST /responsaveis` para cadastrar o responsável.
2. `POST /responsaveis/{id}/discord-link` gera um código único.
3. O responsável entra no servidor Discord da escola e roda
   `/vincular codigo:<codigo>`.
4. O webhook grava o `discord_user_id` e marca o vínculo como confirmado.

**Expondo o webhook publicamente (dev):**

```bash
cloudflared tunnel --url http://localhost:8000
```

Cole a URL gerada (`https://<aleatorio>.trycloudflare.com/webhook/discord`)
em Interactions Endpoint URL no
[Discord Developer Portal](https://discord.com/developers/applications).
URLs de quick tunnel são efêmeras — mudam a cada reinício.

**Registrar o slash command `/vincular`** (uma vez, por guild):

```bash
curl -X PUT \
  "https://discord.com/api/v10/applications/$DISCORD_APPLICATION_ID/guilds/$DISCORD_GUILD_ID/commands" \
  -H "Authorization: Bot $DISCORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '[{"name":"vincular","description":"Vincula seu Discord ao cadastro de responsavel","options":[{"type":3,"name":"codigo","description":"Codigo de vinculo","required":true}]}]'
```
