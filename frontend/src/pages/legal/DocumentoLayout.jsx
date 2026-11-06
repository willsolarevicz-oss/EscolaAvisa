import { ArrowLeft } from 'lucide-react';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Logo } from '../../components/Logo';
import { DOCUMENTOS_VERSAO, instituicaoIncompleta } from '../../config/instituicao';
import { useAuth } from '../../hooks/useAuth';
import { formatDateOnly } from '../../utils/formatters';
import styles from '../../styles/Documento.module.css';

/** Moldura comum da Política e dos Termos: título, versão, aviso de rascunho e navegação. */
export function DocumentoLayout({ titulo, children }) {
  const { isAuthenticated } = useAuth();
  return (
    <div className={`${styles.page} ${isAuthenticated ? '' : styles.standalone}`}>
      {!isAuthenticated && <Logo size="lg" />}
      <header className={styles.header}>
        <h1 className={styles.title}>{titulo}</h1>
        <p className={styles.meta}>Versão de {formatDateOnly(DOCUMENTOS_VERSAO)}</p>
      </header>

      <div className={styles.rascunho}>
        <Alert type="warning">
          <strong>Rascunho — revisar com assessoria jurídica antes do uso em produção.</strong>{' '}
          {instituicaoIncompleta() && 'Há dados da escola a preencher (marcados com [PREENCHER]).'}
        </Alert>
      </div>

      <article className={styles.doc}>{children}</article>

      <div className={styles.links}>
        <Button variant="secondary" icon={ArrowLeft} to={isAuthenticated ? '/dashboard' : '/login'}>
          {isAuthenticated ? 'Voltar ao sistema' : 'Ir para o login'}
        </Button>
      </div>
    </div>
  );
}
