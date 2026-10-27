import { Outlet } from 'react-router';
import { FullScreenLoader } from '../components/FullScreenStatus';
import { AUTH_STATUS } from '../contexts/authContext';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from './DashboardLayout';

/**
 * Para páginas acessíveis com ou sem login (ex.: 404):
 * logado → dentro do layout do sistema; deslogado → página avulsa.
 * Não exige autenticação, então não redireciona para o login.
 */
export function SessionAwareLayout({ title }) {
  const { status } = useAuth();

  if (status === AUTH_STATUS.CHECKING) {
    return <FullScreenLoader message="Verificando sua sessão..." />;
  }

  if (status === AUTH_STATUS.AUTHENTICATED) {
    return <DashboardLayout title={title} />;
  }

  return <Outlet />;
}
