/**
 * Checagem de saúde para agendar (cron, Agendador de Tarefas) ou usar num monitor externo.
 *
 *   npm run saude                                  confere http://localhost:PORT/api/health
 *   npm run saude -- https://api.escola.com.br     confere outra URL base
 *
 * Sai com código 0 se API e banco estão ok; 1 caso contrário (o agendador trata como falha e alerta).
 * Não lê o .env: roda na máquina de monitoramento, sem acesso a segredos.
 */
import { pathToFileURL } from 'node:url';

const TIMEOUT_MS = 5000;

export async function verificarSaude(baseUrl, fetchImpl = fetch) {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/health`;
  const inicio = Date.now();
  try {
    const resposta = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const corpo = await resposta.json().catch(() => ({}));
    const ms = Date.now() - inicio;
    const ok = resposta.status === 200 && corpo?.data?.database === 'ok';
    const detalhe = ok ? 'API e banco ok' : `status ${resposta.status}, banco: ${corpo?.data?.database ?? 'desconhecido'}`;
    return { ok, url, ms, detalhe };
  } catch (error) {
    const detalhe = error.name === 'TimeoutError' ? `sem resposta em ${TIMEOUT_MS} ms` : `falha de conexão (${error.message})`;
    return { ok: false, url, ms: Date.now() - inicio, detalhe };
  }
}

async function main() {
  const baseUrl = process.argv[2] || `http://localhost:${process.env.PORT || 3333}`;
  const { ok, url, ms, detalhe } = await verificarSaude(baseUrl);
  const linha = `[saude] ${new Date().toISOString()} ${ok ? 'OK' : 'FALHA'} ${url} (${ms} ms): ${detalhe}`;
  if (ok) console.log(linha);
  else {
    console.error(linha);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
