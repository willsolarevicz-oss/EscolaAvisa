import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import styles from './PageHeader.module.css';

/**
 * Cabeçalho de página: trilha de navegação (breadcrumbs), título, descrição e ações.
 * breadcrumbs: [{ label, to? }] — o último item é a página atual (sem link).
 */
export function PageHeader({ title, description, breadcrumbs = [], actions }) {
  return (
    <div className={styles.header}>
      {breadcrumbs.length > 0 && (
        <nav aria-label="Trilha de navegação" className={styles.breadcrumbs}>
          <ol>
            {breadcrumbs.map((crumb, index) => {
              const isCurrent = index === breadcrumbs.length - 1;
              return (
                <li key={crumb.label}>
                  {isCurrent || !crumb.to ? (
                    <span aria-current={isCurrent ? 'page' : undefined}>{crumb.label}</span>
                  ) : (
                    <Link to={crumb.to}>{crumb.label}</Link>
                  )}
                  {!isCurrent && <ChevronRight size={14} aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className={styles.row}>
        <div>
          <h2 className={styles.title}>{title}</h2>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
