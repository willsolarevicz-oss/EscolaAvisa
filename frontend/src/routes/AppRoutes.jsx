import { Navigate, Route, Routes } from 'react-router';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { SessionAwareLayout } from '../layouts/SessionAwareLayout';
import { AlunoFormRoute } from '../pages/alunos/AlunoFormPage';
import { AlunosListPage } from '../pages/alunos/AlunosListPage';
import { AuditoriaPage } from '../pages/auditoria/AuditoriaPage';
import { AvisoDetailPage } from '../pages/avisos/AvisoDetailPage';
import { AvisoFormPage } from '../pages/avisos/AvisoFormPage';
import { AvisosListPage } from '../pages/avisos/AvisosListPage';
import { BoletimPage } from '../pages/boletim/BoletimPage';
import { CalendarioPage } from '../pages/calendario/CalendarioPage';
import { EventoFormRoute } from '../pages/calendario/EventoFormPage';
import { DashboardPage } from '../pages/DashboardPage';
import { MinhaOcorrenciaPage } from '../pages/minhas-ocorrencias/MinhaOcorrenciaPage';
import { MinhasOcorrenciasPage } from '../pages/minhas-ocorrencias/MinhasOcorrenciasPage';
import { MeuAvisoPage } from '../pages/meus-avisos/MeuAvisoPage';
import { ConversaRoute } from '../pages/mensagens/ConversaPage';
import { MensagensPage } from '../pages/mensagens/MensagensPage';
import { NovaConversaPage } from '../pages/mensagens/NovaConversaPage';
import { GradeNotasPage } from '../pages/notas/GradeNotasPage';
import { NotasTurmasPage } from '../pages/notas/NotasTurmasPage';
import { OcorrenciaDetailPage } from '../pages/ocorrencias/OcorrenciaDetailPage';
import { OcorrenciaFormPage } from '../pages/ocorrencias/OcorrenciaFormPage';
import { OcorrenciasListPage } from '../pages/ocorrencias/OcorrenciasListPage';
import { RelatoriosPage } from '../pages/relatorios/RelatoriosPage';
import { ResponsaveisListPage } from '../pages/responsaveis/ResponsaveisListPage';
import { MinhaTurmaRoute } from '../pages/minhas-turmas/MinhaTurmaPage';
import { MinhasTurmasPage } from '../pages/minhas-turmas/MinhasTurmasPage';
import { MeusAvisosPage } from '../pages/meus-avisos/MeusAvisosPage';
import { DisciplinaFormRoute } from '../pages/disciplinas/DisciplinaFormPage';
import { DisciplinasListPage } from '../pages/disciplinas/DisciplinasListPage';
import { TurmaFormRoute } from '../pages/turmas/TurmaFormPage';
import { TurmasListPage } from '../pages/turmas/TurmasListPage';
import { PrivacidadePage } from '../pages/legal/PrivacidadePage';
import { TermosPage } from '../pages/legal/TermosPage';
import { LoginPage } from '../pages/LoginPage';
import { MeusDadosPage } from '../pages/meus-dados/MeusDadosPage';
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
          <Route path="/calendario" element={<CalendarioPage />} />
          <Route path="/meus-dados" element={<MeusDadosPage />} />
          <Route path="/mensagens" element={<MensagensPage />} />
          <Route path="/mensagens/nova" element={<NovaConversaPage />} />
          <Route path="/mensagens/:id" element={<ConversaRoute />} />

          <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route path="/usuarios" element={<UsuariosListPage />} />
            <Route path="/usuarios/novo" element={<UsuarioFormRoute />} />
            <Route path="/usuarios/:id/editar" element={<UsuarioFormRoute />} />
            <Route path="/responsaveis" element={<ResponsaveisListPage />} />
            <Route path="/auditoria" element={<AuditoriaPage />} />
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
            <Route path="/ocorrencias" element={<OcorrenciasListPage />} />
            <Route path="/ocorrencias/nova" element={<OcorrenciaFormPage />} />
            <Route path="/ocorrencias/:id" element={<OcorrenciaDetailPage />} />
            <Route path="/notas" element={<NotasTurmasPage />} />
            <Route path="/notas/turmas/:turmaId/disciplinas/:disciplinaId" element={<GradeNotasPage />} />
            <Route path="/calendario/eventos/novo" element={<EventoFormRoute />} />
            <Route path="/calendario/eventos/:id/editar" element={<EventoFormRoute />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['PROFESSOR']} />}>
            <Route path="/minhas-turmas" element={<MinhasTurmasPage />} />
            <Route path="/minhas-turmas/:turmaId" element={<MinhaTurmaRoute />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['RESPONSAVEL']} />}>
            <Route path="/meus-avisos" element={<MeusAvisosPage />} />
            <Route path="/meus-avisos/:id" element={<MeuAvisoPage />} />
            <Route path="/minhas-ocorrencias" element={<MinhasOcorrenciasPage />} />
            <Route path="/minhas-ocorrencias/:id" element={<MinhaOcorrenciaPage />} />
            <Route path="/boletim" element={<BoletimPage />} />
          </Route>
        </Route>
      </Route>

      {/* Públicas (com ou sem login): precisam ser lidas ANTES do aceite e por quem nem tem conta. */}
      <Route element={<SessionAwareLayout title="Privacidade" />}>
        <Route path="/privacidade" element={<PrivacidadePage />} />
      </Route>
      <Route element={<SessionAwareLayout title="Termos de Uso" />}>
        <Route path="/termos" element={<TermosPage />} />
      </Route>

      <Route element={<SessionAwareLayout title="Página não encontrada" />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
