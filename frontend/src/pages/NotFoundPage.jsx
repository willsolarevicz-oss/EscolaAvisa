import { ArrowLeft, LayoutDashboard, LogIn } from 'lucide-react';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/useAuth';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  const { isAuthenticated } = useAuth();

  // O destino depende da sessão: evita mandar um visitante para /dashboard só para ser redirecionado.
  const home = isAuthenticated
    ? { to: '/dashboard', label: 'Voltar ao dashboard', icon: LayoutDashboard }
    : { to: '/login', label: 'Ir para o login', icon: LogIn };

  return (
    <div className={`${styles.page} ${isAuthenticated ? styles.inLayout : styles.standalone}`}>
      {!isAuthenticated && <Logo size="lg" />}
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Página não encontrada</h1>
      <p className={styles.text}>O endereço acessado não existe ou foi movido.</p>
      <div className={styles.actions}>
        {/* Button com `to` vira um Link; `replace` não deixa a URL quebrada no histórico. */}
        <Button to={home.to} replace icon={home.icon}>
          {home.label}
        </Button>
        {/* Só oferece "voltar" se houver histórico dentro do próprio site. */}
        {window.history.state?.idx > 0 && (
          <Button variant="secondary" icon={ArrowLeft} onClick={() => window.history.back()}>
            Página anterior
          </Button>
        )}
      </div>
    </div>
  );
}
