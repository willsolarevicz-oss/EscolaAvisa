# Plano de resposta a incidentes — EscolaAvisa

Incidente de segurança = qualquer evento que comprometa a **confidencialidade, integridade ou
disponibilidade** de dados pessoais: vazamento, acesso indevido (conta invadida, perfil vendo o que não
devia), perda de dados, ransomware, backup exposto, envio de dados à pessoa errada.

> **Rascunho técnico — revisar com a assessoria jurídica e o encarregado de dados.** Base: LGPD art. 46–48
> e Regulamento de Comunicação de Incidente de Segurança (Resolução CD/ANPD nº 15/2024). Confira o texto
> vigente no site da ANPD antes de usar.

## Contatos

| Papel | Quem | Contato |
| --- | --- | --- |
| Encarregado de dados (DPO) | `[PREENCHER]` | `[PREENCHER]` |
| Direção da escola (controladora) | `[PREENCHER]` | `[PREENCHER]` |
| Responsável técnico | `[PREENCHER]` | `[PREENCHER]` |
| Hospedagem (suporte) | `[PREENCHER]` | `[PREENCHER]` |
| Assessoria jurídica | `[PREENCHER]` | `[PREENCHER]` |

Mantenha uma cópia desta página **fora do sistema** (impressa ou em outro serviço): num incidente, o
sistema e o e-mail podem estar indisponíveis.

## Passo a passo

### 1. Detectar e registrar (hora zero)

- Anote **quando** e **como** soube (monitor, log `[erro]`, tela Auditoria, aviso de usuário, Dependabot).
- Abra o registro do incidente (modelo no fim desta página). **Comunique o encarregado imediatamente.**
- O prazo para avisar a ANPD conta a partir de quando a escola **soube** do incidente.

### 2. Conter (primeiras horas)

Conforme o caso:

| Situação | Contenção |
| --- | --- |
| Conta invadida | Desativar o usuário (tela Usuários) e redefinir a senha |
| Segredo vazado (`JWT_SECRET`, senha do banco) | Trocar no `.env` da produção e reiniciar: **todos os tokens caem**; trocar a senha do banco no provedor |
| Falha no código explorada | Tirar a API do ar ou bloquear a rota no proxy; corrigir por PR com teste do caso |
| Backup exposto | Revogar o acesso ao local, apagar a cópia exposta, verificar logs de acesso do armazenamento |
| Perda/corrupção de dados | Parar escritas; restaurar em banco novo a partir do último backup bom ([OPERACAO.md](OPERACAO.md#restaurar)) |

**Preserve as evidências antes de limpar:** exporte a trilha de auditoria do período, guarde os logs do
servidor e da hospedagem e **não** rode `npm run retencao` até o incidente ser encerrado.

### 3. Avaliar (até 48 h)

- Quais dados? (lista na Política, seção "Quais dados") — **dados de crianças e de saúde (ocorrências
  do tipo Saúde) aumentam a gravidade.**
- Quantos titulares e quais grupos (responsáveis, professores, alunos)?
- Os dados estavam protegidos (ex.: senhas com bcrypt não são legíveis)? O acesso foi confirmado ou só possível?
- Quais consequências para as pessoas (discriminação, fraude, constrangimento, risco à criança)?

Se o incidente **pode causar risco ou dano relevante** aos titulares, é obrigatório comunicar (passo 4).
Na dúvida, o encarregado decide com o jurídico e registra a justificativa.

### 4. Comunicar (prazo: 3 dias úteis)

- **ANPD:** formulário de comunicação de incidente no site da ANPD, em até **3 dias úteis** da ciência.
  Informações que faltarem podem ser complementadas depois (prazo de complemento no regulamento).
- **Titulares afetados:** no mesmo prazo, em linguagem simples, por meio direto (e-mail/mensagem e
  aviso no sistema): o que aconteceu, quais dados, riscos, o que a escola fez e o que a pessoa pode fazer
  (ex.: trocar senha), e o contato do encarregado. Para responsáveis, lembrar que os dados dos filhos
  também foram afetados.
- Conteúdo mínimo (art. 48 §1º): natureza dos dados, titulares envolvidos, medidas de segurança usadas,
  riscos, motivo de eventual demora e medidas tomadas para reverter ou reduzir o dano.

### 5. Recuperar e corrigir

- Corrija a causa por PR (com teste que reproduz o problema) e confira a CI.
- Restaure dados se preciso; confira contagens e uma amostra com a secretaria.
- Se houve falha de dependência, siga o processo de vulnerabilidades do [SECURITY.md](../SECURITY.md).

### 6. Encerrar e aprender

- Reunião curta (até 2 semanas): o que aconteceu, o que funcionou, o que mudar. Atualize este plano.
- **Guarde o registro do incidente por pelo menos 5 anos**, mesmo os que não foram comunicados à ANPD.

## Modelo de registro

```text
Incidente nº:            Aberto em (data/hora):         Ciência em (data/hora):
Detectado por/como:
Descrição:
Dados afetados:                        Nº de titulares:          Crianças? Dados de saúde?
Risco ou dano relevante? (sim/não + justificativa):
Contenção (o que e quando):
Comunicado à ANPD em:                  Protocolo:
Comunicado aos titulares em:           Meio:
Causa raiz:
Correção (PR):
Encerrado em:                          Lições aprendidas:
```

## Treino

Uma vez por ano, simule um incidente (ex.: "senha de um admin vazou") seguindo esta página do início ao
fim, sem comunicar ninguém de fora. Anote o tempo de cada passo.
