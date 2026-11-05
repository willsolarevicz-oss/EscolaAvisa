import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { getApiErrorMessage } from '../services/api';

/**
 * Carrega um registro pelo id (telas de edição/detalhe).
 * - fetcher(id, { signal }) → Promise<registro>
 * - onLoad(registro): chamado quando chega (ex.: preencher o formulário)
 * Sem `id` (tela de criação) o status é 'idle' e nada é buscado.
 * status: 'idle' | 'loading' | 'ready' | 'notfound' | 'error'
 */
export function useEntityLoader(fetcher, id, { onLoad, errorMessage = 'Não foi possível carregar os dados.' } = {}) {
  const [state, setState] = useState({ status: id ? 'loading' : 'idle', data: null, errorMessage: '' });
  const [reloadToken, setReloadToken] = useState(0);

  // Callbacks costumam ser recriados a cada render; guardamos o mais recente
  // para a busca depender só do id (e do "tentar novamente").
  const latest = useRef({ fetcher, onLoad, errorMessage });
  useEffect(() => {
    latest.current = { fetcher, onLoad, errorMessage };
  });

  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController();

    latest.current
      .fetcher(id, { signal: controller.signal })
      .then((data) => {
        latest.current.onLoad?.(data);
        setState({ status: 'ready', data, errorMessage: '' });
      })
      .catch((error) => {
        if (axios.isCancel(error)) return;
        if (error.response?.status === 404) {
          setState({ status: 'notfound', data: null, errorMessage: '' });
        } else {
          setState({ status: 'error', data: null, errorMessage: getApiErrorMessage(error, latest.current.errorMessage) });
        }
      });

    return () => controller.abort();
  }, [id, reloadToken]);

  return {
    ...state,
    reload: () => setReloadToken((n) => n + 1),
    /** Atualiza o registro em memória (ex.: depois de uma ação na própria tela). */
    setData: (updater) => setState((prev) => ({ ...prev, data: typeof updater === 'function' ? updater(prev.data) : updater })),
  };
}
