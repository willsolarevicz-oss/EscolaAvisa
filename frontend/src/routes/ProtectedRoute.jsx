import { Navigate, Outlet, useLocation } from 'react-router';
import { ConnectionErrorScreen, FullScreenLoader } from '../components/FullScreenStatus';
import { AUTH_STATUS } from '../contexts/authContext';
import { useAuth } from '../hooks/useAuth';
import { AceiteTermosPage } from '../pages/legal/AceiteTermosPage';

/** Só renderiza as rotas filhas com sessão válida; caso contrário, manda para /login. */
export function ProtectedRoute() {
  const { status, user, errorMessage, retrySessionCheck, logout } = useAuth();
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

  // LGPD: sem aceitar a versão vigente da Política/Termos, mostra o aceite no lugar do sistema.
  // (As páginas /privacidade e /termos ficam fora desta rota, para poderem ser lidas antes.)
  if (user?.termos && !user.termos.aceito) {
    return <AceiteTermosPage />;
  }

  return <Outlet />;
}
