import axios from 'axios';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { CONTADORES_EVENT, getContadores } from '../services/contadorService';

// Sem tempo real no backend: um "polling" leve mantém os números razoavelmente frescos.
const INTERVALO_MS = 60_000;

/**
 * Contadores da sidebar. Atualiza: ao trocar de página, a cada minuto (só com a aba
 * visível) e quando uma tela avisa que leu algo (`notificarMudancaContadores`).
 * Falha ao buscar não quebra nada: os números só deixam de aparecer.
 */
export function useContadores() {
  const { pathname } = useLocation();
  const [contadores, setContadores] = useState({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const atualizar = () => setTick((n) => n + 1);
    const onVisible = () => {
      if (document.visibilityState === 'visible') atualizar();
    };
    const timer = window.setInterval(onVisible, INTERVALO_MS);
    window.addEventListener(CONTADORES_EVENT, atualizar);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(CONTADORES_EVENT, atualizar);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getContadores({ signal: controller.signal })
      .then(setContadores)
      .catch((error) => {
        if (axios.isCancel(error)) return;
        console.warn('[contadores] não foi possível atualizar:', error.message);
      });
    return () => controller.abort();
  }, [pathname, tick]);

  return contadores;
}
