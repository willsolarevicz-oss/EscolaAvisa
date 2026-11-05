import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

/**
 * Mensagem enviada por outra página via `navigate(url, { state: { flash } })`
 * (ex.: "Usuário criado"). É lida uma vez e removida do histórico, para não
 * reaparecer ao recarregar a página.
 */
export function useFlashMessage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [flash, setFlash] = useState(() => location.state?.flash ?? null);

  useEffect(() => {
    if (location.state?.flash) {
      navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
    }
  }, [location.state, location.pathname, location.search, navigate]);

  return [flash, setFlash];
}
