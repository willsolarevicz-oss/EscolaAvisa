import { Link } from 'react-router';
import { Logo } from '../components/Logo';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <Logo size="lg" />
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Página não encontrada</h1>
      <p className={styles.text}>O endereço acessado não existe ou foi movido.</p>
      <Link to="/dashboard" className={styles.link}>
        Ir para o início
      </Link>
    </div>
  );
}
