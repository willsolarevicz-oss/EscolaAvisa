import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import styles from './Alert.module.css';

const ICONS = { error: CircleAlert, warning: TriangleAlert, info: Info, success: CircleCheck };

/**
 * Mensagem de feedback. `error` usa role="alert" para ser lida por leitores de tela.
 * Com `onClose`, mostra um botão para dispensar a mensagem.
 */
export function Alert({ type = 'info', children, onClose }) {
  const Icon = ICONS[type] ?? Info;
  return (
    <div className={`${styles.alert} ${styles[type]}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} aria-hidden="true" className={styles.icon} />
      <div className={styles.content}>{children}</div>
      {onClose && (
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar mensagem">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
