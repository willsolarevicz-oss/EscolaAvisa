// Lembra a última URL (busca, filtros, página) de cada listagem, para os formulários
// voltarem para ela ao salvar/cancelar em vez de para a lista "zerada".
// sessionStorage: vale só nesta aba e some ao fechá-la (não é preferência permanente).

const PREFIXO = 'escolaavis.lista:';

/** Chamado pela listagem sempre que a URL dela muda. */
export function lembrarLista(pathname, search) {
  try {
    if (search) sessionStorage.setItem(PREFIXO + pathname, search);
    else sessionStorage.removeItem(PREFIXO + pathname);
  } catch (error) {
    // Storage bloqueado (ex.: modo privado restrito): só perde a conveniência de voltar com os filtros.
    console.warn('[lista] não foi possível lembrar os filtros:', error.message);
  }
}

/** URL da listagem com os filtros que estavam aplicados (ou a lista sem filtros). */
export function urlDaLista(pathname) {
  try {
    const search = sessionStorage.getItem(PREFIXO + pathname);
    // Só aceita uma query string (começa com "?"): nunca vira um redirecionamento para outro lugar.
    return search && search.startsWith('?') ? pathname + search : pathname;
  } catch (error) {
    console.warn('[lista] não foi possível ler os filtros salvos:', error.message);
    return pathname;
  }
}
