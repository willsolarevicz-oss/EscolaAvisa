/**
 * Limpeza pelos prazos da Política de Privacidade (hoje: trilha de auditoria, AUDITORIA_RETENCAO_DIAS).
 *
 *   npm run retencao                        SIMULAÇÃO: só mostra o que seria apagado (padrão)
 *   npm run retencao -- --executar          apaga, depois de digitar "sim" no terminal
 *   npm run retencao -- --executar --yes    apaga sem perguntar (rotina agendada)
 *
 * Rode um backup antes (npm run backup): o que for apagado aqui não volta.
 */
import readline from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import { env } from '../src/config/env.js';
import { closePool } from '../src/database/pool.js';
import { executarLimpeza, planejarLimpeza } from '../src/services/retencaoService.js';

function nomeDoBanco() {
  try {
    const url = new URL(env.databaseUrl);
    return `${url.pathname.slice(1)} em ${url.hostname}`;
  } catch {
    return 'configurado no .env';
  }
}

const data = (valor) => (valor ? new Date(valor).toISOString().slice(0, 10) : '—');

async function confirmar(total) {
  if (!process.stdin.isTTY) {
    throw new Error('Apagar exige confirmação. Rode de novo com --executar --yes (rotina agendada).');
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const resposta = await rl.question(
      `[retencao] Isso vai APAGAR ${total} registro(s) do banco ${nomeDoBanco()}. Digite "sim" para continuar: `,
    );
    return resposta.trim().toLowerCase() === 'sim';
  } finally {
    rl.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const executar = args.includes('--executar');
  const yes = args.includes('--yes');

  const plano = await planejarLimpeza();
  console.log(`[retencao] Banco: ${nomeDoBanco()}`);
  for (const item of plano.itens) {
    console.log(
      `[retencao] ${item.dados}: ${item.total} registro(s) anteriores a ${data(item.limite)} ` +
        `(prazo de ${item.dias} dias; mais antigo: ${data(item.maisAntigo)})`,
    );
  }

  const total = plano.itens.reduce((soma, item) => soma + item.total, 0);
  if (!executar) {
    console.log('[retencao] SIMULAÇÃO: nada foi apagado. Para apagar: npm run retencao -- --executar');
    return;
  }
  if (total === 0) {
    console.log('[retencao] Nada a apagar.');
    return;
  }
  if (!yes && !(await confirmar(total))) {
    console.log('[retencao] Cancelado. Nada foi apagado.');
    return;
  }

  const resultado = await executarLimpeza();
  for (const item of resultado.itens) {
    console.log(`[retencao] ${item.dados}: ${item.apagados} registro(s) apagado(s).`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((error) => {
      console.error('[retencao] FALHOU:', error.message);
      process.exitCode = 1;
    })
    .finally(() => closePool());
}
