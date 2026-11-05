import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { getApiErrorMessage } from '../services/api';
import { lembrarLista } from '../utils/listaMemoria';
import { useDebouncedValue } from './useDebouncedValue';

/**
 * Estado de uma listagem paginada com filtros na URL (?busca=&page=&...).
 * `fetchPage(params, { signal })` deve devolver `{ items, pagination }` e ser estável
 * (função de módulo, ex.: listUsuarios).
 */
export function usePaginatedList(fetchPage, { pageSize = 10, errorMessage = 'Não foi possível carregar os dados.' } = {}) {
  // Filtros e página ficam na URL: recarregar a página ou compartilhar o link mantém a busca.
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const { pathname } = useLocation();
  const hasFilters = [...searchParams.keys()].some((key) => key !== 'page');

  const [buscaInput, setBuscaInput] = useState(() => searchParams.get('busca') ?? '');
  const debouncedBusca = useDebouncedValue(buscaInput.trim());

  const updateParams = useCallback(
    (changes) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([key, value]) => {
            if (value === '' || value === null || value === undefined) next.delete(key);
            else next.set(key, String(value));
          });
          // Mudou um filtro: volta para a primeira página.
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Os formulários voltam para esta mesma URL (com os filtros) ao salvar/cancelar.
  useEffect(() => {
    lembrarLista(pathname, queryString ? `?${queryString}` : '');
  }, [pathname, queryString]);

  // Aplica a busca só quando o usuário para de digitar.
  const lastAppliedBusca = useRef(debouncedBusca);
  useEffect(() => {
    if (debouncedBusca === lastAppliedBusca.current) return;
    lastAppliedBusca.current = debouncedBusca;
    updateParams({ busca: debouncedBusca });
  }, [debouncedBusca, updateParams]);

  // `loading` é derivado: o resultado guardado é de outra chave = ainda buscando.
  const [reloadToken, setReloadToken] = useState(0);
  const requestKey = `${queryString}#${reloadToken}`;
  const [result, setResult] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    const params = { pageSize, ...Object.fromEntries(new URLSearchParams(queryString)) };

    fetchPage(params, { signal: controller.signal })
      .then((data) => setResult({ key: requestKey, data, error: null }))
      .catch((error) => {
        if (axios.isCancel(error)) return;
        // Mantém os dados anteriores na tela e mostra o erro.
        setResult((prev) => ({ key: requestKey, data: prev.data, error: getApiErrorMessage(error, errorMessage) }));
      });

    // Cancela a requisição anterior se o filtro mudar antes da resposta chegar.
    return () => controller.abort();
  }, [fetchPage, pageSize, errorMessage, queryString, requestKey]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  const clearFilters = useCallback(() => {
    setBuscaInput('');
    lastAppliedBusca.current = '';
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const goToPage = useCallback((page) => updateParams({ page: page > 1 ? page : '' }), [updateParams]);

  return {
    searchParams,
    hasFilters,
    buscaInput,
    setBuscaInput,
    updateParams,
    clearFilters,
    goToPage,
    reload,
    items: result.data?.items ?? [],
    pagination: result.data?.pagination ?? null,
    error: result.error,
    loading: result.key !== requestKey,
  };
}
