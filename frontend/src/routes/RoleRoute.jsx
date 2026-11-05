import { Outlet } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { ForbiddenPage } from '../pages/ForbiddenPage';

/**
 * Restringe rotas a perfis. Use DENTRO de ProtectedRoute (já garante login).
 * Isto é só experiência de uso: quem autoriza de verdade é o backend (authorize()).
 */
export function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!allowedRoles.includes(user?.tipoUsuario)) {
    return <ForbiddenPage />;
  }

  return <Outlet />;
}
