/**
 * Backup do banco com pg_dump (formato custom: comprimido e restaurável com pg_restore).
 *
 *   npm run backup                 gera um backup em BACKUP_DIR (padrão: backend/backups)
 *   npm run backup -- --keep=14    e depois apaga os mais antigos, mantendo os 14 mais novos
 *   npm run backup:verificar -- <arquivo>   confere se o arquivo é restaurável (não toca no banco)
 *
 * O arquivo tem TODOS os dados pessoais do sistema: guarde cifrado e fora do servidor (ver docs/OPERACAO.md).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { env } from '../src/config/env.js';

const PREFIXO = 'escolaavis-';
const EXTENSAO = '.dump';

/**
 * Converte a DATABASE_URL em argumentos + variáveis do pg_dump.
 * A senha vai em PGPASSWORD (ambiente do processo filho), nunca na linha de comando,
 * que qualquer usuário da máquina consegue ver na lista de processos.
 */
export function conexaoPg(databaseUrl) {
  const url = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL precisa começar com postgres:// ou postgresql://');
  }
  const banco = decodeURIComponent(url.pathname.slice(1));
  if (!banco) throw new Error('DATABASE_URL sem o nome do banco');

  const args = ['--host', url.hostname || 'localhost', '--port', url.port || '5432', '--dbname', banco];
  if (url.username) args.push('--username', decodeURIComponent(url.username));

  const variaveis = {};
  if (url.password) variaveis.PGPASSWORD = decodeURIComponent(url.password);
  const sslmode = url.searchParams.get('sslmode');
  if (sslmode) variaveis.PGSSLMODE = sslmode;
  return { banco, args, variaveis };
}

/** Nome com data e hora em UTC: ordenar por nome = ordenar por data. */
export function nomeArquivoBackup(banco, data = new Date()) {
  const carimbo = data.toISOString().replace(/\.\d{3}Z$/, 'Z').replaceAll(':', '-');
  return `${PREFIXO}${banco}-${carimbo}${EXTENSAO}`;
}

/**
 * Backups que sobram depois de manter os `manter` mais novos DESTE banco.
 * Só considera arquivos no padrão exato gerado aqui: nada mais da pasta é apagado.
 */
export function backupsParaApagar(nomes, banco, manter) {
  if (!Number.isInteger(manter) || manter < 1) throw new Error('--keep precisa ser um inteiro maior que zero');
  const bancoEscapado = banco.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
  const padrao = new RegExp(`^${PREFIXO}${bancoEscapado}-\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}Z\\.dump$`);
  return nomes
    .filter((nome) => padrao.test(nome))
    .sort()
    .reverse()
    .slice(manter);
}

/** Caminho do executável: PG_BIN_DIR (ex.: C:\Program Files\PostgreSQL\17\bin) ou o PATH. */
export function executavel(nome) {
  return env.pgBinDir ? path.join(env.pgBinDir, nome) : nome;
}

function rodar(comando, args, variaveis = {}) {
  return new Promise((resolve, reject) => {
    const filho = spawn(executavel(comando), args, {
      env: { ...process.env, ...variaveis },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let saida = '';
    let erros = '';
    filho.stdout.on('data', (parte) => (saida += parte));
    filho.stderr.on('data', (parte) => (erros += parte));
    filho.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error(`${comando} não encontrado. Instale o cliente do PostgreSQL ou defina PG_BIN_DIR no .env.`));
      } else reject(error);
    });
    filho.on('close', (codigo) => {
      if (codigo === 0) resolve(saida);
      else reject(new Error(`${comando} terminou com código ${codigo}: ${erros.trim()}`));
    });
  });
}

export async function gerarBackup({ databaseUrl = env.databaseUrl, pasta = env.backupDir, agora = new Date() } = {}) {
  const { banco, args, variaveis } = conexaoPg(databaseUrl);
  await fs.mkdir(pasta, { recursive: true });
  const destino = path.join(pasta, nomeArquivoBackup(banco, agora));
  // Grava num nome temporário e só renomeia no fim: backup que falhou no meio nunca parece válido.
  const parcial = `${destino}.parcial`;
  try {
    await rodar('pg_dump', [...args, '--format=custom', '--no-owner', '--file', parcial], variaveis);
    await fs.rename(parcial, destino);
  } catch (error) {
    await fs.rm(parcial, { force: true });
    throw error;
  }
  // Só o dono lê (no Windows não tem efeito; lá, proteja a pasta pelas permissões do sistema).
  await fs.chmod(destino, 0o600);
  const { size } = await fs.stat(destino);
  return { banco, arquivo: destino, bytes: size };
}

/** Lista o conteúdo do backup com pg_restore --list: falha se o arquivo estiver corrompido. */
export async function verificarBackup(arquivo) {
  const indice = await rodar('pg_restore', ['--list', arquivo]);
  const tabelas = indice.split('\n').filter((linha) => / TABLE DATA /.test(linha)).length;
  if (tabelas === 0) throw new Error('O arquivo não tem dados de nenhuma tabela.');
  return { arquivo, tabelas };
}

async function rotacionar(pasta, banco, manter) {
  const apagar = backupsParaApagar(await fs.readdir(pasta), banco, manter);
  for (const nome of apagar) {
    await fs.rm(path.join(pasta, nome));
    console.log(`[backup] removido (mais antigo que os ${manter} mais novos): ${nome}`);
  }
}

async function main() {
  const [comando, ...resto] = process.argv.slice(2);
  if (comando === 'verificar') {
    if (!resto[0]) throw new Error('Informe o arquivo: npm run backup:verificar -- <arquivo>');
    const { arquivo, tabelas } = await verificarBackup(path.resolve(resto[0]));
    console.log(`[backup] OK: ${arquivo} é restaurável (${tabelas} tabelas com dados).`);
    return;
  }

  const keepArg = process.argv.slice(2).find((arg) => arg.startsWith('--keep='));
  const manter = keepArg ? Number(keepArg.slice('--keep='.length)) : undefined;
  // Valida antes de gastar tempo com o dump.
  if (keepArg) backupsParaApagar([], 'x', manter);

  const { banco, arquivo, bytes } = await gerarBackup();
  console.log(`[backup] gerado: ${arquivo} (${(bytes / 1024).toFixed(1)} KiB)`);
  await verificarBackup(arquivo);
  console.log('[backup] conferido com pg_restore --list.');
  if (manter) await rotacionar(env.backupDir, banco, manter);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[backup] FALHOU:', error.message);
    process.exitCode = 1;
  });
}
