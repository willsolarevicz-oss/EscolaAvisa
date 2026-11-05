import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage, setUnauthorizedHandler } from '../services/api';
import * as authService from '../services/authService';
import { TOKEN_STORAGE_KEY, tokenStorage } from '../utils/tokenStorage';
import { AUTH_STATUS, AuthContext } from './authContext';

const EXPIRED_MESSAGE = 'Sua sessão expirou. Faça login novamente.';
// setTimeout não aceita mais que ~24,8 dias.
const MAX_TIMEOUT_MS = 2_147_483_647;

// expiresAt está no relógio LOCAL (ver tokenStorage); null = desconhecido, o backend decide no /me.
function isUsableToken(token, expiresAt) {
  if (!token) return false;
  return expiresAt === null || expiresAt > Date.now();
}

function getInitialState() {
  const token = tokenStorage.get();
  const expiresAt = tokenStorage.getExpiresAt();
  if (isUsableToken(token, expiresAt)) {
    return { status: AUTH_STATUS.CHECKING, user: null, token, expiresAt, notice: null, errorMessage: null };
  }
  return {
    status: AUTH_STATUS.UNAUTHENTICATED,
    user: null,
    token: null,
    expiresAt: null,
    notice: token ? { type: 'warning', message: EXPIRED_MESSAGE } : null,
    errorMessage: null,
  };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(getInitialState);

  const clearSession = useCallback((notice = null) => {
    tokenStorage.clear();
    setState({
      status: AUTH_STATUS.UNAUTHENTICATED,
      user: null,
      token: null,
      expiresAt: null,
      notice,
      errorMessage: null,
    });
  }, []);

  // Remove do navegador um token salvo que já estava expirado ao abrir a página.
  useEffect(() => {
    if (!isUsableToken(tokenStorage.get(), tokenStorage.getExpiresAt())) tokenStorage.clear();
  }, []);

  // Valida o token salvo no backend (ao abrir a página, e ao clicar em "tentar novamente").
  useEffect(() => {
    if (state.status !== AUTH_STATUS.CHECKING) return undefined;
    let cancelled = false;

    authService
      .getMe({ skipAuthHandler: true })
      .then((user) => {
        if (!cancelled) {
          setState((prev) => ({ ...prev, status: AUTH_STATUS.AUTHENTICATED, user, errorMessage: null }));
        }
      })
      .catch((error) => {
        if (cancelled) return;
        if (error.response?.status === 401) {
          clearSession({ type: 'warning', message: error.response.data?.message || EXPIRED_MESSAGE });
        } else {
          // Servidor fora do ar: não apagamos o token, o usuário pode tentar de novo.
          setState((prev) => ({ ...prev, status: AUTH_STATUS.ERROR, errorMessage: getApiErrorMessage(error) }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [state.status, clearSession]);

  // Qualquer 401 vindo da API (token expirado/revogado) encerra a sessão.
  useEffect(() => {
    setUnauthorizedHandler((message) => {
      clearSession({ type: 'warning', message: message || EXPIRED_MESSAGE });
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // Encerra a sessão no momento em que o token expira, mesmo sem nenhuma requisição.
  // Usa expiresAt (relógio local), nunca o "exp" do JWT: com o relógio do PC errado,
  // comparar "exp" (horário do servidor) com Date.now() derrubaria sessões válidas.
  useEffect(() => {
    if (state.status !== AUTH_STATUS.AUTHENTICATED || state.expiresAt === null) return undefined;
    const remaining = state.expiresAt - Date.now();

    const timer = setTimeout(
      () => clearSession({ type: 'warning', message: EXPIRED_MESSAGE }),
      Math.min(Math.max(remaining, 0), MAX_TIMEOUT_MS),
    );
    return () => clearTimeout(timer);
  }, [state.status, state.expiresAt, clearSession]);

  // Mantém as abas sincronizadas: logout/login em uma aba vale para as outras.
  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== TOKEN_STORAGE_KEY && event.key !== null) return;
      const token = tokenStorage.get();
      if (!token) {
        setState({
          status: AUTH_STATUS.UNAUTHENTICATED,
          user: null,
          token: null,
          expiresAt: null,
          notice: null,
          errorMessage: null,
        });
      } else {
        const expiresAt = tokenStorage.getExpiresAt();
        setState((prev) =>
          prev.token === token ? prev : { ...prev, status: AUTH_STATUS.CHECKING, token, expiresAt, user: null },
        );
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = useCallback(async (email, senha) => {
    const result = await authService.login(email, senha);
    // expiresIn (segundos) vem do servidor; somado ao relógio local no momento da resposta.
    const expiresAt = Date.now() + result.expiresIn * 1000;
    tokenStorage.set(result.token, expiresAt);
    setState({
      status: AUTH_STATUS.AUTHENTICATED,
      user: result.user,
      token: result.token,
      expiresAt,
      notice: null,
      errorMessage: null,
    });
    return result.user;
  }, []);

  // JWT é stateless: o logout remove o token do navegador (ver PROGRESSO.md, "Decisões").
  const logout = useCallback(() => {
    clearSession({ type: 'info', message: 'Você saiu do sistema com segurança.' });
  }, [clearSession]);

  const retrySessionCheck = useCallback(() => {
    setState((prev) => (prev.token ? { ...prev, status: AUTH_STATUS.CHECKING, errorMessage: null } : prev));
  }, []);

  const clearNotice = useCallback(() => {
    setState((prev) => (prev.notice ? { ...prev, notice: null } : prev));
  }, []);

  const value = useMemo(
    () => ({
      status: state.status,
      user: state.user,
      token: state.token,
      notice: state.notice,
      errorMessage: state.errorMessage,
      isAuthenticated: state.status === AUTH_STATUS.AUTHENTICATED,
      isLoading: state.status === AUTH_STATUS.CHECKING,
      login,
      logout,
      retrySessionCheck,
      clearNotice,
    }),
    [state, login, logout, retrySessionCheck, clearNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
