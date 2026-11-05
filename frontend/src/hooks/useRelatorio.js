import axios from 'axios';
import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/api';

/**
 * Busca um relatório e refaz a busca quando os parâmetros mudam.
 * - `params = null` não busca (ex.: falta escolher a turma);
 * - ao trocar o filtro, os dados anteriores continuam na tela (sem "piscar") até chegar o novo;
 * - `loading` é derivado: o resultado guardado é de outros parâmetros = ainda buscando.
 * `fetcher` deve ser estável (função de módulo).
 */
export function useRelatorio(fetcher, params, errorMessage = 'Não foi possível carregar o relatório.') {
  const key = params ? JSON.stringify(params) : null;
  const [result, setResult] = useState({ key: null, data: null, error: '' });

  useEffect(() => {
    if (!key) return undefined;
    const controller = new AbortController();
    fetcher(JSON.parse(key), { signal: controller.signal })
      .then((data) => setResult({ key, data, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setResult((prev) => ({ key, data: prev.data, error: getApiErrorMessage(error, errorMessage) }));
      });
    return () => controller.abort();
  }, [fetcher, key, errorMessage]);

  return {
    data: key ? result.data : null,
    error: result.key === key ? result.error : '',
    loading: Boolean(key) && result.key !== key,
  };
}
