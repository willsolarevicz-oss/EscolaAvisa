import { Navigate, Outlet } from 'react-router';
import { FullScreenLoader } from '../components/FullScreenStatus';
import { AUTH_STATUS } from '../contexts/authContext';
import { useAuth } from '../hooks/useAuth';

/** Páginas como /login: quem já está logado vai direto para o dashboard. */
export function PublicOnlyRoute() {
  const { status } = useAuth();

  if (status === AUTH_STATUS.CHECKING) {
    return <FullScreenLoader message="Verificando sua sessão..." />;
  }

  if (status === AUTH_STATUS.AUTHENTICATED) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
