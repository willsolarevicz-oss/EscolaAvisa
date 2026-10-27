import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../hooks/useAuth';
import styles from './DashboardLayout.module.css';

const SIDEBAR_ID = 'app-sidebar';

/** Layout das páginas autenticadas. `title` aparece no header. */
export function DashboardLayout({ title = 'Dashboard' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      />
      <div className={styles.main}>
        <Header
          title={title}
          user={user}
          sidebarId={SIDEBAR_ID}
          menuOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
