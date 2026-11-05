import axios from 'axios';
import { useEffect, useState } from 'react';
import { listMinhasTurmas } from '../services/avisoService';
import { listTurmas } from '../services/turmaService';

/**
 * Turmas que o usuário pode escolher em formulários (avisos, eventos):
 * professor → turmas em que leciona; admin → turmas ativas.
 * status: 'loading' | 'ready' | 'error'
 */
export function useTurmasDisponiveis(isProfessor) {
  const [state, setState] = useState({ status: 'loading', items: [] });

  useEffect(() => {
    const controller = new AbortController();
    const request = isProfessor
      ? listMinhasTurmas({ signal: controller.signal })
      : listTurmas({ ativo: 'true', pageSize: 100 }, { signal: controller.signal }).then((data) => data.items);

    request
      .then((items) => setState({ status: 'ready', items }))
      .catch((error) => {
        if (!axios.isCancel(error)) setState({ status: 'error', items: [] });
      });
    return () => controller.abort();
  }, [isProfessor]);

  return state;
}
