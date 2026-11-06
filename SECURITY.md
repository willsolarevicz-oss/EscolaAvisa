# Segurança do EscolaAvisa

O EscolaAvisa guarda dados pessoais de **crianças e adolescentes** e de suas famílias. Segurança aqui não é opcional.

## Como reportar uma vulnerabilidade

**Não abra issue pública.** Use o reporte privado do GitHub:
[Security → Report a vulnerability](https://github.com/willsolarevicz-oss/EscolaAvisa/security/advisories/new).

Descreva o que encontrou, como reproduzir e o impacto. Prazo de resposta: até **5 dias úteis** para confirmar o recebimento.
Pedimos que não divulgue a falha antes da correção.

## Versões com correção

Só a versão atual da branch `main` recebe correções de segurança.

## O que já está em vigor

| Proteção | Onde |
|---|---|
| Senhas com bcrypt (custo 12); login sem revelar se o e-mail existe | `backend/src/utils/password.js` |
| JWT com validade curta; sessão encerra ao expirar | `backend/src/services/authService.js`, `frontend/src/contexts/AuthProvider.jsx` |
| Controle de acesso por perfil e por escopo (cada um só vê o que é dele), testado | rotas `authorize(...)` + services |
| SQL sempre parametrizado (inclusive buscas) | `backend/src/repositories/*` |
| Validação de toda entrada (zod) e corpo limitado a 100 kB | `backend/src/validators/*`, `app.js` |
| Rate limit: login (10 falhas/15 min por IP) e geral da API (300/min por IP) | `backend/src/middlewares/rateLimiters.js` |
| Cabeçalhos de segurança (Helmet), CORS restrito às origens do frontend | `backend/src/app.js` |
| Content-Security-Policy no build do frontend (bloqueia script injetado) | `frontend/vite.config.js` |
| Trilha de auditoria de toda alteração e tentativa de login (sem gravar o conteúdo) | tabela `auditoria`, tela Auditoria (ADMIN) |
| Erros internos nunca vão para o usuário (só para o log do servidor) | `backend/src/middlewares/errorHandler.js` |
| CI em todo PR: testes, lint, build e `npm audit` (barra alta/crítica) | `.github/workflows/ci.yml` |
| CodeQL (análise estática) em todo PR e semanalmente | `.github/workflows/codeql.yml` |
| Dependabot: PRs semanais de atualização | `.github/dependabot.yml` |

## Gestão de vulnerabilidades

1. **Encontrar:** Dependabot, `npm audit` na CI, CodeQL e reportes privados.
2. **Avaliar:** alta/crítica em dependência de produção → corrigir antes de qualquer outra entrega; moderada/baixa → avaliar se o código vulnerável é alcançável e registrar abaixo.
3. **Corrigir:** branch própria, testes, PR com CI verde.
4. **Registrar:** decisão e data nesta página e no `PROGRESSO.md`.

### Riscos conhecidos e aceitos

| Risco | Por que foi aceito | Revisar quando |
|---|---|---|
| 3 vulnerabilidades **moderadas** (`glob`/`minimatch`) dentro do `node-pg-migrate` (backend) | A ferramenta só lê a pasta de migrations, sem entrada do usuário; a correção sugerida rebaixa a ferramenta (9 → 7) e quebra | Sair versão corrigida do `node-pg-migrate` (o Dependabot avisa) |
| Token de sessão no `localStorage` | Sem cookie não há CSRF; o risco de XSS é reduzido pela CSP e pelo React escapar o conteúdo | Se a hospedagem permitir cookie `httpOnly` no mesmo domínio |
| CSP com `style-src 'unsafe-inline'` | A interface usa estilo inline para larguras de barras; estilo não executa código | Trocar as larguras por classes/CSS variables |

## Na hospedagem (produção)

- **HTTPS obrigatório** (o backend já envia HSTS pelo Helmet; o proxy deve redirecionar HTTP → HTTPS).
- Enviar também o cabeçalho `Content-Security-Policy` com `frame-ancestors 'none'` (impede o site de ser embutido em outro; não funciona via `<meta>`).
- `TRUST_PROXY` configurado com o número de proxies (senão o rate limit trata todos como um IP só).
- `JWT_SECRET` forte e exclusivo de produção; `.env` nunca no repositório.
- Banco com acesso restrito à rede da API, conexão com TLS e backups diários cifrados fora do servidor ([docs/OPERACAO.md](docs/OPERACAO.md)).
- Monitor externo do `/api/health` e alerta para `[erro]` no log; em incidente, siga o [docs/INCIDENTES.md](docs/INCIDENTES.md).
