# Relatório de conformidade — os 40 requisitos

> Auditoria inicial em 2026-11-06 (9 atendidos, 10 parciais, 15 não atendidos, 6 não se aplicam) e
> correções nas Fases 16 (segurança técnica), 17 (LGPD no produto) e 18 (operação).
> Situação em **2026-11-06, fim da Fase 18**. Revisar a cada fase nova e pelo menos uma vez por ano.

## Legenda

| Situação | Significado |
| --- | --- |
| ✅ Atendido | Resolvido no código/documentação deste repositório |
| ⚖️ Pronto, falta a escola | Código e rascunho prontos; faltam dados da escola (`[PREENCHER]`) e/ou revisão jurídica |
| 🏗️ Pronto, falta a hospedagem | Scripts e instruções prontos; a configuração acontece onde o sistema for publicado |
| 🟡 Parcial | Parte feita, parte pendente no código |
| ➖ Não se aplica | O sistema não tem a funcionalidade (justificado) |

## Resumo

| Situação | Itens | Total |
| --- | --- | --- |
| ✅ Atendido | 1, 2, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 29, 30, 32, 36, 37, 39, 40 | 21 |
| ⚖️ Pronto, falta a escola | 11, 12, 19, 20, 21, 26, 34, 35 | 8 |
| 🏗️ Pronto, falta a hospedagem | 3, 4, 31, 33 | 4 |
| 🟡 Parcial | 38 | 1 |
| ➖ Não se aplica | 22, 23, 24, 25, 27, 28 | 6 |

## Segurança

| # | Requisito | Situação | Evidência |
| --- | --- | --- | --- |
| 1 | Autenticação segura | ✅ | JWT com validade (`JWT_EXPIRES_IN`), login não revela se o e-mail existe, usuário inativo barrado; testes em `auth.test.js` |
| 2 | Controle de acesso | ✅ | Perfis checados no backend (`authorize`), cada perfil só vê o que é seu (ex.: responsável só os próprios alunos) |
| 3 | Criptografia de dados | 🏗️ | Senhas com bcrypt; em trânsito: HTTPS na hospedagem; em repouso: disco/banco cifrado do provedor e backups cifrados ([OPERACAO.md](OPERACAO.md#backup)) |
| 4 | HTTPS/TLS | 🏗️ | HSTS enviado pelo Helmet; redirecionamento e certificado no proxy (checklist no [SECURITY.md](../SECURITY.md)) |
| 5 | Hashing de senhas | ✅ | bcrypt custo 12; hash nunca sai da API (nem no "Meus dados") |
| 6 | SQL injection | ✅ | Todas as queries parametrizadas, inclusive buscas (`buscaSemAcento`) |
| 7 | XSS/CSRF | ✅ | React escapa o conteúdo; CSP no build (testada); sem cookie de sessão, sem CSRF. Risco aceito: token no `localStorage` (SECURITY.md) |
| 8 | Rate limiting | ✅ | Login (10/15 min) e geral da API (300/min) por IP; testados |
| 9 | Proteção de APIs | ✅ | Helmet, CORS restrito, corpo ≤ 100 kB, validação zod em toda entrada |
| 10 | Auditoria de dependências | ✅ | `npm audit` na CI, Dependabot semanal, CodeQL em PR e semanal |
| 32 | Logs seguros | ✅ | Auditoria nunca grava corpo; log de erro sem query string e com prefixo `[erro]`; erros internos nunca vão ao usuário |
| 33 | Monitoramento de ameaças | 🏗️ | `/api/health`, `npm run saude`, prefixo `[erro]`, tela Auditoria ("só falhas"); monitor externo e alerta na hospedagem ([OPERACAO.md](OPERACAO.md#monitoramento)) |
| 36 | Testes de segurança | ✅ | Testes de token forjado/expirado, RBAC, rate limit, senha fora das respostas, privacidade das conversas, anonimização |
| 37 | Revisão de código | ✅ | Toda mudança entra por PR com CI (testes, lint, build, audit, licenças, CodeQL). Recomendado: proteger a `main` no GitHub |
| 38 | Privilégios administrativos | 🟡 | Perfil ADMIN separado e trilha de auditoria de toda alteração; **falta 2FA** para administradores |
| 39 | Gestão de vulnerabilidades | ✅ | [SECURITY.md](../SECURITY.md): reporte privado, prazos, riscos aceitos |

## Privacidade (LGPD)

| # | Requisito | Situação | Evidência |
| --- | --- | --- | --- |
| 11 | Política de privacidade | ⚖️ | `/privacidade` pública, com dados de crianças (art. 14) e sensíveis; dados da escola `[PREENCHER]` em `frontend/src/config/instituicao.js` |
| 12 | Bases legais | ⚖️ | Bases sugeridas por finalidade na Política; confirmar com o jurídico |
| 13 | Minimização de dados | ✅ | Só o necessário; CPF e telefone opcionais; BrasilAPI recebe só o ano |
| 14 | Finalidades documentadas | ✅ | Seção de finalidades da Política, ligada a cada tipo de dado |
| 15 | Gestão de consentimento | ✅ | Aceite versionado (versão, data, IP) em `aceites_termos`; "autorizado a receber comunicações" por vínculo |
| 16 | Política de cookies | ✅ | Não há cookies; uso de `localStorage`/`sessionStorage` explicado na Política |
| 17 | Direitos dos titulares | ✅ | "Meus dados" (ver e baixar JSON); correção e eliminação pelo encarregado |
| 18 | Exclusão/anonimização | ✅ | Anonimização de usuário inativo pelo ADMIN, preservando o histórico escolar obrigatório |
| 19 | Retenção de dados | ⚖️ | Tabela de prazos na Política; limpeza automática da auditoria (`npm run retencao`); prazos de histórico/comunicações `[PREENCHER]` |
| 20 | Contratos com operadores | ⚖️ | Tabela de operadores e checklist de contrato em [OPERACAO.md](OPERACAO.md#operadores-de-dados-lgpd-art-39); contratos são da escola |
| 26 | Identificação do fornecedor | ⚖️ | Rodapé do login e da sidebar e seção da Política com nome/CNPJ/endereço `[PREENCHER]` |
| 30 | Transparência sobre IA | ✅ | Seção na Política: o sistema não usa IA para decisões; o código foi desenvolvido com auxílio de IA, revisado e testado |
| 34 | Resposta a incidentes | ⚖️ | [INCIDENTES.md](INCIDENTES.md): conter, avaliar, recuperar, aprender; contatos `[PREENCHER]` |
| 35 | Notificação de incidentes | ⚖️ | Fluxo de comunicação à ANPD e aos titulares em até 3 dias úteis (Res. CD/ANPD 15/2024), modelo de registro |
| 40 | Auditoria de conformidade | ✅ | Este documento |

## Termos, licenças e operação

| # | Requisito | Situação | Evidência |
| --- | --- | --- | --- |
| 21 | Termos de uso | ⚖️ | `/termos` público com aceite registrado; foro e dados da escola `[PREENCHER]` |
| 29 | Licenças de uso | ✅ | [LICENSE](../LICENSE) proprietária (titular `[PREENCHER]`); [inventário das dependências](LICENCAS-DEPENDENCIAS.md), todas permissivas, conferido na CI |
| 31 | Backups automatizados | 🏗️ | `npm run backup` (pg_dump + verificação + rotação), restauração e agendamento em [OPERACAO.md](OPERACAO.md#backup); falta agendar na hospedagem e copiar para fora |

## Não se aplicam

| # | Requisito | Por quê |
| --- | --- | --- |
| 22 | Preços | O sistema não vende nada: é ferramenta interna da escola, sem cobrança dos usuários (Termos de Uso, uso gratuito) |
| 23 | Cobranças | Idem: não há pagamento nem dados de cartão |
| 24 | Assinaturas | Idem: não há planos nem renovação |
| 25 | Reembolso | Idem: sem pagamento, não há o que reembolsar |
| 27 | Publicidade | O sistema não exibe anúncios nem usa dados para marketing |
| 28 | Depoimentos | Não há página de vendas nem depoimentos de clientes |

Se o sistema passar a ser vendido para outras escolas, os itens 22–25, 27 e 28 voltam a se aplicar
(CDC: preço claro, cancelamento, arrependimento em 7 dias, publicidade não enganosa).

## O que falta para "tudo verde"

1. **Escola:** preencher os `[PREENCHER]` (`instituicao.js`, `LICENSE`, `INCIDENTES.md`, `OPERACAO.md`),
   revisar Política, Termos e plano de incidentes com o jurídico, assinar contratos com os operadores.
2. **Hospedagem:** HTTPS, banco/disco cifrados, backup agendado e copiado para fora, monitor externo do
   `/api/health` e alerta de `[erro]` no log.
3. **Código:** 2FA para administradores (item 38).
