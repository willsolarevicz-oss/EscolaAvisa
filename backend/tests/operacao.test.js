import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import {
  backupsParaApagar,
  conexaoPg,
  executavel,
  gerarBackup,
  nomeArquivoBackup,
  verificarBackup,
} from '../scripts/backup.js';
import { dependenciasDeProducao, licencaAceita } from '../scripts/inventario-licencas.js';
import { verificarSaude } from '../scripts/verificar-saude.js';
import { env, parseRetencaoAuditoria } from '../src/config/env.js';
import { rotaParaLog } from '../src/middlewares/errorHandler.js';
import { ROTA_LIMPEZA_AUDITORIA } from '../src/repositories/retencaoRepository.js';
import { executarLimpeza, planejarLimpeza } from '../src/services/retencaoService.js';
import { pool, resetDatabase } from './helpers/testDb.js';

const DIA_MS = 24 * 60 * 60 * 1000;

describe('backup: conexão com o pg_dump', () => {
  it('a senha vai no ambiente (PGPASSWORD), nunca nos argumentos', () => {
    const { banco, args, variaveis } = conexaoPg('postgres://escola:s3nh%40forte@db.interno:6543/escolaavis?sslmode=require');
    assert.equal(banco, 'escolaavis');
    assert.deepEqual(args, ['--host', 'db.interno', '--port', '6543', '--dbname', 'escolaavis', '--username', 'escola']);
    assert.equal(variaveis.PGPASSWORD, 's3nh@forte');
    assert.equal(variaveis.PGSSLMODE, 'require');
    assert.ok(!args.join(' ').includes('s3nh'));
  });

  it('usa a porta padrão e recusa URL que não é do PostgreSQL', () => {
    assert.deepEqual(conexaoPg('postgresql://u@localhost/x').args.slice(0, 4), ['--host', 'localhost', '--port', '5432']);
    assert.throws(() => conexaoPg('mysql://u:p@localhost/x'), /postgres:\/\//);
    assert.throws(() => conexaoPg('postgres://u:p@localhost/'), /sem o nome do banco/);
  });
});

describe('backup: nomes e rotação', () => {
  it('nome com data/hora UTC, ordenável e sem ":" (vale no Windows)', () => {
    const nome = nomeArquivoBackup('escolaavis', new Date('2026-11-06T09:05:07.123Z'));
    assert.equal(nome, 'escolaavis-escolaavis-2026-11-06T09-05-07Z.dump');
  });

  it('mantém os N mais novos e só mexe em backups deste banco no padrão exato', () => {
    const nomes = [
      nomeArquivoBackup('escolaavis', new Date('2026-11-01T03:00:00Z')),
      nomeArquivoBackup('escolaavis', new Date('2026-11-03T03:00:00Z')),
      nomeArquivoBackup('escolaavis', new Date('2026-11-02T03:00:00Z')),
      nomeArquivoBackup('escolaavis_test', new Date('2026-10-01T03:00:00Z')), // outro banco
      'escolaavis-escolaavis-manual.dump', // fora do padrão: nunca é apagado
      'leia-me.txt',
    ];
    assert.deepEqual(backupsParaApagar(nomes, 'escolaavis', 2), ['escolaavis-escolaavis-2026-11-01T03-00-00Z.dump']);
    assert.deepEqual(backupsParaApagar(nomes, 'escolaavis', 5), []);
    assert.throws(() => backupsParaApagar(nomes, 'escolaavis', 0), /--keep/);
  });
});

/** O teste real só roda com um pg_dump da mesma versão do servidor ou mais nova (exigência do pg_dump). */
async function pgDumpCompativel() {
  const versao = spawnSync(executavel('pg_dump'), ['--version'], { encoding: 'utf8' });
  if (versao.status !== 0) return 'pg_dump não encontrado (defina PG_BIN_DIR)';
  const cliente = Number(versao.stdout.match(/(\d+)\.\d+/)?.[1]);
  const { rows } = await pool.query('SHOW server_version_num');
  const servidor = Math.floor(Number(rows[0].server_version_num) / 10000);
  return cliente >= servidor ? null : `pg_dump ${cliente} é mais antigo que o servidor ${servidor}`;
}

describe('backup: geração e verificação de verdade', () => {
  let pasta;
  let motivoParaPular;
  before(async () => {
    await resetDatabase();
    motivoParaPular = await pgDumpCompativel();
    pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'escolaavis-backup-'));
  });
  after(() => fs.rm(pasta, { recursive: true, force: true }));

  it('gera um .dump restaurável e não deixa arquivo parcial', async (t) => {
    if (motivoParaPular) return t.skip(motivoParaPular);
    const { arquivo, bytes } = await gerarBackup({ databaseUrl: env.databaseUrl, pasta });
    assert.ok(bytes > 0);
    const { tabelas } = await verificarBackup(arquivo);
    assert.ok(tabelas >= 10, `poucas tabelas no backup: ${tabelas}`);
    assert.deepEqual(await fs.readdir(pasta), [path.basename(arquivo)]);
  });

  it('arquivo corrompido não passa na verificação', async (t) => {
    if (motivoParaPular) return t.skip(motivoParaPular);
    const ruim = path.join(pasta, 'corrompido.dump');
    await fs.writeFile(ruim, 'isto não é um backup');
    await assert.rejects(verificarBackup(ruim), /pg_restore terminou com código/);
  });
});

describe('retenção da auditoria', () => {
  const agora = new Date();
  const diasAtras = (dias) => new Date(agora.getTime() - dias * DIA_MS);

  before(async () => {
    await resetDatabase();
    await pool.query('DELETE FROM auditoria');
    for (const [dias, rota] of [
      [400, '/api/velho-1'],
      [380, '/api/velho-2'],
      [100, '/api/recente'],
    ]) {
      await pool.query(
        `INSERT INTO auditoria (metodo, rota, status, criado_em) VALUES ('POST', $1, 200, $2)`,
        [rota, diasAtras(dias)],
      );
    }
  });

  it('prazo vem do .env com mínimo de 6 meses (Marco Civil)', () => {
    assert.equal(parseRetencaoAuditoria(undefined), 365);
    assert.equal(parseRetencaoAuditoria('730'), 730);
    for (const valor of ['90', '182', '1.5', 'um ano']) {
      assert.throws(() => parseRetencaoAuditoria(valor), /AUDITORIA_RETENCAO_DIAS inválido/, valor);
    }
  });

  it('a simulação conta o que passou do prazo e não apaga nada', async () => {
    const { itens } = await planejarLimpeza({ dias: 365, agora });
    assert.equal(itens[0].total, 2);
    assert.equal(new Date(itens[0].maisAntigo).toISOString().slice(0, 10), diasAtras(400).toISOString().slice(0, 10));
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM auditoria');
    assert.equal(rows[0].n, 3);
  });

  it('sem terminal e sem --yes, o script recusa apagar', async () => {
    const result = spawnSync(process.execPath, [path.join(env.backendRoot, 'scripts/retencao.js'), '--executar'], {
      cwd: env.backendRoot,
      env: { ...process.env, NODE_ENV: 'test', AUDITORIA_RETENCAO_DIAS: '365' },
      input: '',
      encoding: 'utf8',
    });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /exige confirmação/);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM auditoria');
    assert.equal(rows[0].n, 3);
  });

  it('a execução apaga só o que passou do prazo e registra a limpeza na trilha', async () => {
    const { itens } = await executarLimpeza({ dias: 365, agora });
    assert.equal(itens[0].apagados, 2);
    const { rows } = await pool.query('SELECT rota, metodo, usuario_id FROM auditoria ORDER BY rota');
    assert.deepEqual(
      rows.map((r) => r.rota),
      ['/api/recente', ROTA_LIMPEZA_AUDITORIA].sort(),
    );
    const limpeza = rows.find((r) => r.rota === ROTA_LIMPEZA_AUDITORIA);
    assert.equal(limpeza.metodo, 'DELETE');
    assert.equal(limpeza.usuario_id, null);
  });

  it('rodar de novo não apaga nada nem cria outro registro de limpeza', async () => {
    const { itens } = await executarLimpeza({ dias: 365, agora });
    assert.equal(itens[0].apagados, 0);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM auditoria');
    assert.equal(rows[0].n, 2);
  });
});

describe('checagem de saúde (npm run saude)', () => {
  const resposta = (status, corpo) => async () => ({ status, json: async () => corpo });

  it('ok só com API e banco respondendo', async () => {
    const ok = await verificarSaude('http://api.local/', resposta(200, { data: { database: 'ok' } }));
    assert.equal(ok.ok, true);
    assert.equal(ok.url, 'http://api.local/api/health');
  });

  it('banco fora (503) e API fora do ar contam como falha', async () => {
    const semBanco = await verificarSaude('http://api.local', resposta(503, { data: { database: 'indisponivel' } }));
    assert.equal(semBanco.ok, false);
    assert.match(semBanco.detalhe, /status 503, banco: indisponivel/);

    const foraDoAr = await verificarSaude('http://api.local', async () => {
      throw new TypeError('fetch failed');
    });
    assert.equal(foraDoAr.ok, false);
    assert.match(foraDoAr.detalhe, /falha de conexão/);
  });
});

describe('log de erro', () => {
  it('rota sem query string, sem quebra de linha nem caractere de controle e com tamanho limitado', () => {
    assert.equal(rotaParaLog('/api/alunos?busca=Maria%20Silva'), '/api/alunos');
    assert.equal(rotaParaLog('/api/x\r\n[erro] linha forjada'), '/api/x[erro] linha forjada');
    assert.equal(rotaParaLog('/api/\u0000\u001b[31mx'), '/api/[31mx');
    assert.equal(rotaParaLog(`/api/${'a'.repeat(500)}`).length, 200);
  });
});

describe('inventário de licenças', () => {
  it('aceita permissivas e expressões SPDX; barra copyleft e licença ausente', () => {
    for (const ok of ['MIT', 'ISC', 'Apache-2.0', '(MIT OR GPL-3.0)', 'MIT AND BSD-3-Clause']) {
      assert.equal(licencaAceita(ok), true, ok);
    }
    for (const ruim of ['GPL-3.0', 'AGPL-3.0-only', 'LGPL-2.1', 'MIT AND GPL-2.0', null, 'UNLICENSED']) {
      assert.equal(licencaAceita(ruim), false, String(ruim));
    }
  });

  it('lista só dependências de produção, com o nome certo mesmo aninhado ou com escopo', () => {
    const lock = {
      packages: {
        '': { name: 'app' },
        'node_modules/express': { version: '5.0.0', license: 'MIT' },
        'node_modules/@scope/pacote': { version: '1.0.0', license: 'ISC' },
        'node_modules/a/node_modules/b': { version: '2.0.0', license: 'BSD-2-Clause' },
        'node_modules/supertest': { version: '7.0.0', license: 'MIT', dev: true },
      },
    };
    assert.deepEqual(
      dependenciasDeProducao(lock).map((p) => `${p.nome}@${p.versao}`),
      ['@scope/pacote@1.0.0', 'b@2.0.0', 'express@5.0.0'],
    );
  });
});

after(() => pool.end());
