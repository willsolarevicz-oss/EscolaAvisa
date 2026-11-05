import { LogOut, Menu } from 'lucide-react';
import { getInitials, roleLabel } from '../utils/formatters';
import styles from './Header.module.css';

export function Header({ title, user, onMenuClick, menuOpen, sidebarId, onLogout, temPendencias = false }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label={temPendencias ? 'Abrir menu (há itens novos)' : 'Abrir menu'}
          aria-expanded={menuOpen}
          aria-controls={sidebarId}
        >
          <Menu size={22} />
          {temPendencias && <span className={styles.menuDot} aria-hidden="true" />}
        </button>
        <h1 className={styles.title}>{title}</h1>
      </div>

      <div className={styles.right}>
        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden="true">
            {getInitials(user.nome)}
          </span>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.nome}</span>
            <span className={styles.userRole}>{roleLabel(user.tipoUsuario)}</span>
          </div>
        </div>

        <span className={styles.divider} aria-hidden="true" />

        {/* aria-label: no celular o texto "Sair" some e fica só o ícone. */}
        <button type="button" className={styles.logout} onClick={onLogout} aria-label="Sair do sistema">
          <LogOut size={18} aria-hidden="true" />
          <span className={styles.logoutLabel}>Sair</span>
        </button>
      </div>
    </header>
  );
}
