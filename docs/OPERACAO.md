# Operação — EscolaAvis

Rotinas para manter o sistema no ar e os dados seguros: backup, restauração, retenção (limpeza),
monitoramento e operadores de dados. Os comandos rodam na pasta `backend/` e usam o `backend/.env`.

> Resposta a incidentes de segurança: [INCIDENTES.md](INCIDENTES.md). Segurança técnica: [SECURITY.md](../SECURITY.md).

## Rotinas em resumo

| Rotina | Comando | Frequência sugerida |
| --- | --- | --- |
| Backup do banco | `npm run backup -- --keep=14` | Diária (madrugada) |
| Copiar o backup para fora do servidor | (ferramenta da hospedagem) | Logo após o backup |
| Teste de restauração | ver "Restaurar" abaixo | Mensal |
| Limpeza por retenção | `npm run retencao -- --executar --yes` | Mensal, **depois** de um backup |
| Checagem de saúde | `npm run saude -- https://SEU-DOMINIO` | A cada 1–5 min (monitor externo) |
| Revisar a trilha de auditoria | tela **Auditoria**, filtro "só falhas" | Semanal |
| Licenças das dependências | `npm run licencas` | A cada atualização de dependência (a CI confere) |

## Backup

`npm run backup` usa o `pg_dump` (formato *custom*, comprimido) e grava em `BACKUP_DIR`
(padrão `backend/backups/`, fora do git). Depois de gerar, confere o arquivo com `pg_restore --list`.

- `--keep=N` apaga os backups mais antigos **deste banco**, mantendo os N mais novos. Só apaga arquivos
  no padrão `escolaavis-<banco>-<data>Z.dump`: backups renomeados à mão nunca são apagados.
- A senha do banco vai para o `pg_dump` pela variável `PGPASSWORD`, nunca na linha de comando.
- Se o `pg_dump` não estiver no PATH, defina `PG_BIN_DIR` (ex.: `C:\Program Files\PostgreSQL\17\bin`).
  A versão do `pg_dump` precisa ser **igual ou maior** que a do servidor.
- `npm run backup:verificar -- <arquivo>` confere um backup existente sem tocar no banco.

**O backup contém todos os dados pessoais do sistema** (inclusive de crianças e dados de saúde):

- guarde **cifrado** e **fora do servidor** do banco (outro provedor ou região), com acesso restrito;
- mantenha pelo menos 14 diários e, se possível, 1 mensal por 12 meses;
- dados apagados pela retenção continuam nos backups antigos até eles serem descartados: o prazo de
  guarda dos backups conta como prazo de retenção. **Pendência:** citar esse prazo na Política de
  Privacidade na próxima revisão do texto (o que muda a versão e pede novo aceite).

### Agendar

Linux (cron do usuário que roda a API), todo dia às 3h, com log:

```cron
0 3 * * * cd /srv/escolaavis/backend && npm run backup -- --keep=14 >> /var/log/escolaavis/backup.log 2>&1
```

Windows (Agendador de Tarefas), no PowerShell como administrador:

```powershell
$acao = New-ScheduledTaskAction -Execute 'npm.cmd' -Argument 'run backup -- --keep=14' -WorkingDirectory 'C:\escolaavis\backend'
Register-ScheduledTask -TaskName 'EscolaAvis backup' -Action $acao -Trigger (New-ScheduledTaskTrigger -Daily -At 3am)
```

Hospedagem com banco gerenciado (RDS, Cloud SQL, Supabase, Neon...): ative **também** o backup
automático/PITR do provedor. O script continua útil como cópia independente do provedor.

## Restaurar

Restaurar **substitui dados**. Nunca restaure direto no banco de produção sem decidir isso em incidente.
Primeiro restaure num banco novo e confira:

```bash
createdb -h HOST -U USUARIO escolaavis_restaurado
pg_restore -h HOST -U USUARIO --dbname escolaavis_restaurado --no-owner --exit-on-error ARQUIVO.dump
```

Confira (contagem de usuários, alunos, últimos avisos) e só então aponte a `DATABASE_URL` para o banco
restaurado ou troque os bancos. **Teste mensal:** faça essa restauração num banco descartável e anote
data e resultado; backup que nunca foi restaurado não é garantia.

## Retenção (limpeza)

`npm run retencao` aplica os prazos da Política de Privacidade que já estão definidos:

| Dados | Prazo | Automático? |
| --- | --- | --- |
| Trilha de auditoria | `AUDITORIA_RETENCAO_DIAS` (padrão 365; mínimo 183 pelo Marco Civil) | Sim |
| Histórico escolar, comunicações | `[PREENCHER]` na Política (depende da escola/jurídico) | Não: nada é apagado |
| Contas | Desativar e anonimizar a pedido (tela do usuário) | Manual |

- Sem opções é só **simulação**: mostra quantos registros passaram do prazo e não apaga nada.
- `--executar` pede para digitar "sim"; `--executar --yes` apaga sem perguntar (rotina agendada).
- A limpeza roda em transação e fica registrada na própria trilha ("Limpeza da auditoria (retenção)").
- Rode **depois** de um backup.

## Monitoramento

1. **Disponibilidade:** configure um monitor externo (UptimeRobot, Better Stack, o da hospedagem...)
   para `GET https://SEU-DOMINIO/api/health` a cada 1–5 min, alertando por e-mail/WhatsApp quando não
   responder `200`. Sem serviço externo, agende `npm run saude -- https://SEU-DOMINIO` (sai com código 1
   na falha; o agendador alerta). A resposta `503` significa API no ar e **banco fora**.
2. **Erros:** toda falha inesperada vai para o log com o prefixo fixo `[erro]`, data/hora, método e rota
   (sem a query string, que pode ter nomes buscados). Alerte quando aparecer `[erro]` no log; a maioria
   das hospedagens permite alerta por texto no log.
3. **Sinais de ataque** (tela Auditoria, filtro "só falhas"): muitos `Bloqueado` (429: rate limit),
   sequência de `Negado` no login, ações de ADMIN fora do horário ou de IP desconhecido.
   Qualquer suspeita: siga o [INCIDENTES.md](INCIDENTES.md).
4. **Dependências:** Dependabot (semanal) e CodeQL (PR e semanal) já avisam por e-mail no GitHub.

Logs do servidor não devem guardar dados pessoais: a API não registra corpo de requisição, senhas nem
query string. Mantenha os logs da hospedagem pelo mesmo prazo da auditoria.

## Operadores de dados (LGPD art. 39)

Quem trata dados pessoais **em nome da escola** é *operador* e precisa de contrato (ou termos de serviço
aceitos) com cláusulas de proteção de dados.

| Fornecedor | Papel | Dados | Contrato |
| --- | --- | --- | --- |
| Hospedagem da API e do banco `[PREENCHER]` | Operador | Todos | `[PREENCHER: contrato/DPA assinado?]` |
| Armazenamento dos backups `[PREENCHER]` | Operador | Todos (cifrados) | `[PREENCHER]` |
| Desenvolvedor/manutenção `[PREENCHER]` | Operador (quando acessa produção) | Todos | `[PREENCHER: termo de confidencialidade]` |
| GitHub | Hospeda só o **código** | Nenhum dado pessoal de usuários | Termos do GitHub |
| BrasilAPI | Serviço público consultado | Nenhum (só o ano dos feriados) | Não é operador |

Checklist do contrato com cada operador: finalidade limitada ao serviço, confidencialidade, medidas de
segurança, aviso de incidente em até 24–48 h, subcontratação só com autorização, devolução/eliminação
dos dados no fim do contrato, local onde os dados ficam (transferência internacional, art. 33).
