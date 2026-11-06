import { GraduationCap } from 'lucide-react';
import styles from './Logo.module.css';

/** Marca do EscolaAvisa. `variant="light"` para fundos escuros. */
export function Logo({ variant = 'dark', size = 'md' }) {
  return (
    <span className={`${styles.logo} ${styles[variant]} ${styles[size]}`}>
      <span className={styles.mark} aria-hidden="true">
        <GraduationCap strokeWidth={2.2} />
      </span>
      <span className={styles.wordmark}>
        Escola<span className={styles.accent}>Avisa</span>
      </span>
    </span>
  );
}
