import { ArrowLeft, CalendarDays, User, Users } from 'lucide-react';
import { useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { useEntityLoader } from '../../hooks/useEntityLoader';
import { getMeuAviso, marcarAvisoComoLido } from '../../services/avisoService';
import { avisoPublicoLabel, formatDateTime } from '../../utils/formatters';
import formStyles from '../../styles/FormPage.module.css';
import styles from '../../styles/Comunicado.module.css';

/** Leitura de um aviso pelo responsável. Abrir a página registra a visualização. */
export function MeuAvisoPage() {
  const { id } = useParams();
  const loader = useEntityLoader(getMeuAviso, id, {
    errorMessage: 'Não foi possível carregar o aviso.',
    onLoad: (aviso) => {
      if (aviso.lido) return;
      // Registro de leitura em segundo plano: se falhar, o aviso continua visível e
      // a leitura será registrada na próxima vez que for aberto.
      marcarAvisoComoLido(aviso.id)
        .then(({ visualizadoEm }) => loader.setData((prev) => ({ ...prev, lido: true, visualizadoEm })))
        .catch((error) => console.warn('Não foi possível registrar a leitura do aviso.', error));
    },
  });
  const aviso = loader.data;

  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Meus avisos', to: '/meus-avisos' },
    { label: aviso?.titulo ?? 'Aviso' },
  ];

  if (loader.status !== 'ready') {
    return (
      <div className={formStyles.page}>
        <PageHeader title="Aviso" breadcrumbs={breadcrumbs} />
        {loader.status === 'loading' ? (
          <p className={formStyles.muted}>Carregando aviso...</p>
        ) : (
          <>
            <Alert type="error">
              {loader.status === 'notfound' ? 'Aviso não encontrado ou não está mais disponível.' : loader.errorMessage}
            </Alert>
            <div className={formStyles.formActions}>
              <Button to="/meus-avisos" icon={ArrowLeft}>
                Voltar para meus avisos
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={formStyles.page}>
      <PageHeader
        title={aviso.titulo}
        breadcrumbs={breadcrumbs}
        description={
          <span className={styles.meta}>
            <span>
              <Users size={14} aria-hidden="true" /> {avisoPublicoLabel(aviso)}
            </span>
            <span>
              <CalendarDays size={14} aria-hidden="true" /> {formatDateTime(aviso.publicadoEm)}
            </span>
            <span>
              <User size={14} aria-hidden="true" /> {aviso.autorNome}
            </span>
          </span>
        }
        actions={
          aviso.lido && aviso.visualizadoEm ? (
            <Badge tone="success">Lido em {formatDateTime(aviso.visualizadoEm)}</Badge>
          ) : null
        }
      />

      <section className={formStyles.card} aria-label="Conteúdo do aviso">
        <div className={styles.content}>{aviso.conteudo}</div>
      </section>

      <div>
        <Button variant="secondary" to="/meus-avisos" icon={ArrowLeft}>
          Voltar para meus avisos
        </Button>
      </div>
    </div>
  );
}
