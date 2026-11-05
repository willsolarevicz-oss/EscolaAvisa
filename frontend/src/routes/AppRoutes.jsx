import { Navigate, Route, Routes } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { SessionAwareLayout } from '../layouts/SessionAwareLayout';
import { AlunoFormRoute } from '../pages/alunos/AlunoFormPage';
import { AlunosListPage } from '../pages/alunos/AlunosListPage';
import { AvisoDetailPage } from '../pages/avisos/AvisoDetailPage';
import { AvisoFormPage } from '../pages/avisos/AvisoFormPage';
import { AvisosListPage } from '../pages/avisos/AvisosListPage';
import { DashboardPage } from '../pages/DashboardPage';
import { MeuAvisoPage } from '../pages/meus-avisos/MeuAvisoPage';
import { MeusAvisosPage } from '../pages/meus-avisos/MeusAvisosPage';
import { DisciplinaFormRoute } from '../pages/disciplinas/DisciplinaFormPage';
import { DisciplinasListPage } from '../pages/disciplinas/DisciplinasListPage';
import { TurmaFormRoute } from '../pages/turmas/TurmaFormPage';
import { TurmasListPage } from '../pages/turmas/TurmasListPage';
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
            <Route path="/turmas" element={<TurmasListPage />} />
            <Route path="/turmas/nova" element={<TurmaFormRoute />} />
            <Route path="/turmas/:id/editar" element={<TurmaFormRoute />} />
            <Route path="/disciplinas" element={<DisciplinasListPage />} />
            <Route path="/disciplinas/nova" element={<DisciplinaFormRoute />} />
            <Route path="/disciplinas/:id/editar" element={<DisciplinaFormRoute />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['ADMIN', 'PROFESSOR']} />}>
            <Route path="/avisos" element={<AvisosListPage />} />
            <Route path="/avisos/novo" element={<AvisoFormPage />} />
            <Route path="/avisos/:id" element={<AvisoDetailPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['RESPONSAVEL']} />}>
            <Route path="/meus-avisos" element={<MeusAvisosPage />} />
            <Route path="/meus-avisos/:id" element={<MeuAvisoPage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<SessionAwareLayout title="Página não encontrada" />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
