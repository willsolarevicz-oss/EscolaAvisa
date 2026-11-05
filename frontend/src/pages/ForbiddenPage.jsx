import { LayoutDashboard, ShieldAlert } from 'lucide-react';
import { Button } from '../components/Button';
import styles from './ForbiddenPage.module.css';

/** Mostrada (dentro do layout) quando o perfil do usuário não acessa a área pedida. */
export function ForbiddenPage() {
  return (
    <div className={styles.page}>
      <span className={styles.icon} aria-hidden="true">
        <ShieldAlert size={28} />
      </span>
      <h2 className={styles.title}>Acesso restrito</h2>
      <p className={styles.text}>Esta área é exclusiva da administração da escola.</p>
      <Button to="/dashboard" icon={LayoutDashboard}>
        Voltar ao dashboard
      </Button>
    </div>
  );
}
