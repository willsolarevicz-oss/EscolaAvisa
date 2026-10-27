import { LoaderCircle, RefreshCw, ServerCrash } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';
import styles from './FullScreenStatus.module.css';

export function FullScreenLoader({ message = 'Carregando...' }) {
  return (
    <div className={styles.screen} role="status" aria-live="polite">
      <Logo size="lg" />
      <div className={styles.loading}>
        <LoaderCircle className="spin" size={20} aria-hidden="true" />
        <span>{message}</span>
      </div>
    </div>
  );
}

/** Mostrado quando há sessão salva, mas o servidor não respondeu para validá-la. */
export function ConnectionErrorScreen({ message, onRetry, onLogout }) {
  return (
    <div className={styles.screen}>
      <div className={styles.card} role="alert">
        <span className={styles.iconWrap} aria-hidden="true">
          <ServerCrash size={26} />
        </span>
        <h1 className={styles.title}>Não foi possível conectar</h1>
        <p className={styles.text}>{message}</p>
        <div className={styles.actions}>
          <Button icon={RefreshCw} onClick={onRetry}>
            Tentar novamente
          </Button>
          <Button variant="secondary" onClick={onLogout}>
            Voltar ao login
          </Button>
        </div>
      </div>
    </div>
  );
}
