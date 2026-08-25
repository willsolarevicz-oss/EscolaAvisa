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

## Estrutura

```
src/            código da API (FastAPI)
db/migrations/  migrations versionadas do banco
docs/           documentos do projeto
tests/          testes automatizados
```
