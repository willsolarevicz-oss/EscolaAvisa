import { Navigate, Route, Routes } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { SessionAwareLayout } from '../layouts/SessionAwareLayout';
import { AlunoFormRoute } from '../pages/alunos/AlunoFormPage';
import { AlunosListPage } from '../pages/alunos/AlunosListPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { UsuarioFormRoute } from '../pages/usuarios/UsuarioFormPage';
import { UsuariosListPage } from '../pages/usuarios/UsuariosListPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';
import { RoleRoute } from './RoleRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route path="/usuarios" element={<UsuariosListPage />} />
            <Route path="/usuarios/novo" element={<UsuarioFormRoute />} />
            <Route path="/usuarios/:id/editar" element={<UsuarioFormRoute />} />
            <Route path="/alunos" element={<AlunosListPage />} />
            <Route path="/alunos/novo" element={<AlunoFormRoute />} />
            <Route path="/alunos/:id/editar" element={<AlunoFormRoute />} />
          </Route>
        </Route>
      </Route>

      <Route element={<SessionAwareLayout title="Página não encontrada" />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
