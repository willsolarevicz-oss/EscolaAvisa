import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import styles from './Alert.module.css';

const ICONS = { error: CircleAlert, warning: TriangleAlert, info: Info };

/** Mensagem de feedback. `error` usa role="alert" para ser lida por leitores de tela. */
export function Alert({ type = 'info', children }) {
  const Icon = ICONS[type] ?? Info;
  return (
    <div className={`${styles.alert} ${styles[type]}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" className={styles.icon} />
      <div>{children}</div>
    </div>
  );
}
