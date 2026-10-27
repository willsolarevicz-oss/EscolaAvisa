import { Navigate, Route, Routes } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { SessionAwareLayout } from '../layouts/SessionAwareLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout title="Dashboard" />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Route>

      <Route element={<SessionAwareLayout title="Página não encontrada" />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
