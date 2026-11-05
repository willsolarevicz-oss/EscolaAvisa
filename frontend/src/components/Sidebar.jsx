import { X } from 'lucide-react';
import { NavLink } from 'react-router';
import { NAVIGATION } from '../config/navigation';
import { Logo } from './Logo';
import styles from './Sidebar.module.css';

function canSee(roles, tipoUsuario) {
  return !roles || roles.includes(tipoUsuario);
}

export function Sidebar({ id, open, onClose, tipoUsuario, contadores = {} }) {
  const sections = NAVIGATION.filter((section) => canSee(section.roles, tipoUsuario));

  return (
    <>
      {/* Fundo escurecido no celular/tablet; clicar fora fecha o menu. */}
      <div className={`${styles.backdrop} ${open ? styles.backdropVisible : ''}`} onClick={onClose} aria-hidden="true" />

      <aside id={id} className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-label="Menu principal">
        <div className={styles.brand}>
          <Logo />
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {sections.map((section) => (
            <div key={section.title} className={styles.section}>
              <p className={styles.sectionTitle}>{section.title}</p>
              <ul className={styles.list}>
                {section.items
                  .filter((item) => canSee(item.roles, tipoUsuario))
                  .map(({ label, to, icon: Icon, available, counter }) => (
                    <li key={label}>
                      {available ? (
                        <NavLink
                          to={to}
                          onClick={onClose}
                          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
                        >
                          <Icon size={18} aria-hidden="true" />
                          <span>{label}</span>
                          {contadores[counter] > 0 && (
                            <span className={styles.counter}>
                              {contadores[counter] > 99 ? '99+' : contadores[counter]}
                              <span className="visually-hidden"> pendentes</span>
                            </span>
                          )}
                        </NavLink>
                      ) : (
                        // Módulo ainda não implementado: visível (mostra o roadmap), mas desabilitado.
                        <span
                          className={`${styles.item} ${styles.disabled}`}
                          aria-disabled="true"
                          title="Módulo ainda não implementado"
                        >
                          <Icon size={18} aria-hidden="true" />
                          <span>{label}</span>
                          <span className={styles.soon}>Em breve</span>
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>

        <p className={styles.footer}>Versão 1.0 · Fase 10</p>
      </aside>
    </>
  );
}
