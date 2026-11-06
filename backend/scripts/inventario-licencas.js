/**
 * Inventário das licenças das dependências de PRODUÇÃO (backend e frontend), lido dos package-lock.json
 * (não precisa de node_modules nem de internet).
 *
 *   npm run licencas                 regenera docs/LICENCAS-DEPENDENCIAS.md
 *   npm run licencas -- --verificar  só confere (CI): falha se houver licença copyleft ou desconhecida
 *
 * Por que importa: o EscolaAvisa é proprietário. Licenças copyleft (GPL, AGPL...) obrigariam a abrir o código.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SAIDA = path.join(raiz, 'docs', 'LICENCAS-DEPENDENCIAS.md');
const PROJETOS = ['backend', 'frontend'];

// Permissivas: permitem uso em software fechado mantendo o aviso de copyright.
export const PERMITIDAS = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  'BlueOak-1.0.0',
  '0BSD',
  'CC0-1.0',
  'OFL-1.1', // fontes
  'Unlicense',
]);

/** Licença aceita? Expressões "A OR B" valem se alguma opção for aceita; "A AND B", se todas forem. */
export function licencaAceita(licenca) {
  if (!licenca) return false;
  const expr = licenca.replace(/[()]/g, '').trim();
  if (expr.includes(' OR ')) return expr.split(' OR ').some((parte) => licencaAceita(parte));
  if (expr.includes(' AND ')) return expr.split(' AND ').every((parte) => licencaAceita(parte));
  return PERMITIDAS.has(expr);
}

/** Dependências de produção de um package-lock (v2/v3): dev ficam de fora (não vão para o usuário). */
export function dependenciasDeProducao(lock) {
  return Object.entries(lock.packages ?? {})
    .filter(([caminho, pacote]) => caminho !== '' && !pacote.dev && !pacote.link)
    .map(([caminho, pacote]) => ({
      nome: caminho.split('node_modules/').pop(),
      versao: pacote.version ?? '?',
      licenca: pacote.license ?? null,
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome) || a.versao.localeCompare(b.versao));
}

function contar(pacotes) {
  const porLicenca = new Map();
  for (const { licenca } of pacotes) porLicenca.set(licenca ?? '(não informada)', (porLicenca.get(licenca ?? '(não informada)') ?? 0) + 1);
  return [...porLicenca.entries()].sort((a, b) => b[1] - a[1]);
}

export function gerarMarkdown(inventario) {
  const linhas = [
    '# Licenças das dependências',
    '',
    '> Gerado por `npm run licencas` (no `backend/`) a partir dos `package-lock.json`. Não edite à mão.',
    '> Só dependências de **produção** (as de desenvolvimento não são distribuídas).',
    '',
    'O EscolaAvisa é software proprietário (ver [LICENSE](../LICENSE)). Todas as dependências abaixo usam',
    'licenças **permissivas**, que permitem o uso em software fechado desde que os avisos de copyright',
    'delas sejam mantidos (eles ficam dentro de cada pacote em `node_modules` e no bundle do frontend).',
    'A CI roda `npm run licencas -- --verificar` e falha se aparecer licença copyleft ou desconhecida.',
    '',
  ];
  for (const { projeto, pacotes } of inventario) {
    linhas.push(`## ${projeto} (${pacotes.length} pacotes)`, '', '| Licença | Pacotes |', '| --- | --- |');
    for (const [licenca, total] of contar(pacotes)) linhas.push(`| ${licenca} | ${total} |`);
    linhas.push('', '<details><summary>Lista completa</summary>', '', '| Pacote | Versão | Licença |', '| --- | --- | --- |');
    for (const { nome, versao, licenca } of pacotes) linhas.push(`| ${nome} | ${versao} | ${licenca ?? '(não informada)'} |`);
    linhas.push('', '</details>', '');
  }
  return linhas.join('\n');
}

async function main() {
  const verificar = process.argv.includes('--verificar');
  const inventario = [];
  for (const projeto of PROJETOS) {
    const lock = JSON.parse(await fs.readFile(path.join(raiz, projeto, 'package-lock.json'), 'utf8'));
    inventario.push({ projeto, pacotes: dependenciasDeProducao(lock) });
  }

  const problemas = inventario.flatMap(({ projeto, pacotes }) =>
    pacotes.filter((p) => !licencaAceita(p.licenca)).map((p) => `${projeto}: ${p.nome}@${p.versao} (${p.licenca ?? 'não informada'})`),
  );
  if (problemas.length > 0) {
    console.error('[licencas] Licenças que precisam de análise antes de usar num sistema proprietário:');
    problemas.forEach((problema) => console.error(`  - ${problema}`));
    process.exitCode = 1;
  }

  if (verificar) {
    if (problemas.length === 0) console.log('[licencas] OK: todas as dependências de produção têm licença permissiva.');
    return;
  }
  await fs.mkdir(path.dirname(SAIDA), { recursive: true });
  await fs.writeFile(SAIDA, gerarMarkdown(inventario));
  console.log(`[licencas] Gerado: ${path.relative(raiz, SAIDA)}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[licencas] FALHOU:', error.message);
    process.exitCode = 1;
  });
}
