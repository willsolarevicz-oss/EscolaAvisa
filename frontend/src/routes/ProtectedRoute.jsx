import { Navigate, Outlet, useLocation } from 'react-router';
import { ConnectionErrorScreen, FullScreenLoader } from '../components/FullScreenStatus';
import { AUTH_STATUS } from '../contexts/authContext';
import { useAuth } from '../hooks/useAuth';

/** Só renderiza as rotas filhas com sessão válida; caso contrário, manda para /login. */
export function ProtectedRoute() {
  const { status, errorMessage, retrySessionCheck, logout } = useAuth();
  const location = useLocation();

  if (status === AUTH_STATUS.CHECKING) {
    return <FullScreenLoader message="Verificando sua sessão..." />;
  }

  if (status === AUTH_STATUS.ERROR) {
    return <ConnectionErrorScreen message={errorMessage} onRetry={retrySessionCheck} onLogout={logout} />;
  }

  if (status !== AUTH_STATUS.AUTHENTICATED) {
    // Guarda a página pedida para voltar a ela depois do login.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
