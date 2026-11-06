import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { findNavItemByPath } from '../config/navigation';
import { useAuth } from '../hooks/useAuth';
import { useContadores } from '../hooks/useContadores';
import styles from './DashboardLayout.module.css';

const SIDEBAR_ID = 'app-sidebar';

/**
 * Layout das páginas autenticadas. O título do header é o módulo atual da sidebar
 * (ex.: /usuarios/novo → "Usuários"); `title` força um título fixo (ex.: 404).
 */
export function DashboardLayout({ title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contadores = useContadores();
  const temPendencias = Object.values(contadores).some((n) => n > 0);
  const headerTitle = title ?? findNavItemByPath(pathname)?.label ?? 'EscolaAvisa';

  // Esc fecha a gaveta no celular/tablet.
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={styles.shell}>
      <Sidebar
        id={SIDEBAR_ID}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tipoUsuario={user.tipoUsuario}
        contadores={contadores}
      />
      <div className={styles.main}>
        <Header
          title={headerTitle}
          user={user}
          sidebarId={SIDEBAR_ID}
          menuOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
          temPendencias={temPendencias}
        />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
