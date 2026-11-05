import { ArrowLeft, CalendarDays, CheckCircle2, User } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { useEntityLoader } from '../../hooks/useEntityLoader';
import { getApiErrorMessage } from '../../services/api';
import { notificarMudancaContadores } from '../../services/contadorService';
import { getMinhaOcorrencia, registrarCiencia } from '../../services/ocorrenciaService';
import { formatDateOnly, formatDateTime, tipoOcorrencia } from '../../utils/formatters';
import formStyles from '../../styles/FormPage.module.css';
import styles from '../../styles/Comunicado.module.css';
import { urlDaLista } from '../../utils/listaMemoria';

/**
 * Ocorrência vista pelo responsável. A ciência é um clique explícito em "Estou ciente"
 * (e não o simples ato de abrir): é uma confirmação consciente do responsável.
 */
export function MinhaOcorrenciaPage() {
  const { id } = useParams();
  const loader = useEntityLoader(getMinhaOcorrencia, id, { errorMessage: 'Não foi possível carregar a ocorrência.' });
  const ocorrencia = loader.data;
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Minhas ocorrências', to: urlDaLista('/minhas-ocorrencias') },
    { label: ocorrencia ? ocorrencia.alunoNome : 'Ocorrência' },
  ];

  async function handleCiencia() {
    setSaving(true);
    try {
      const { cienteEm } = await registrarCiencia(id);
      loader.setData((prev) => ({ ...prev, ciente: true, cienteEm }));
      notificarMudancaContadores();
      setFeedback({ type: 'success', message: 'Ciência registrada. A escola foi informada.' });
    } catch (error) {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível registrar a ciência.') });
    } finally {
      setSaving(false);
    }
  }

  if (loader.status !== 'ready') {
    return (
      <div className={formStyles.page}>
        <PageHeader title="Ocorrência" breadcrumbs={breadcrumbs} />
        {loader.status === 'loading' ? (
          <p className={formStyles.muted}>Carregando ocorrência...</p>
        ) : (
          <>
            <Alert type="error">
              {loader.status === 'notfound' ? 'Ocorrência não encontrada ou não está mais disponível.' : loader.errorMessage}
            </Alert>
            <div className={formStyles.formActions}>
              <Button to={urlDaLista('/minhas-ocorrencias')} icon={ArrowLeft}>
                Voltar para minhas ocorrências
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  const tipo = tipoOcorrencia(ocorrencia.tipo);

  return (
    <div className={formStyles.page}>
      <PageHeader
        title={`Ocorrência — ${ocorrencia.alunoNome}`}
        breadcrumbs={breadcrumbs}
        description={
          <span className={styles.meta}>
            <Badge tone={tipo.tone}>{tipo.label}</Badge>
            <span>
              <CalendarDays size={14} aria-hidden="true" /> {formatDateOnly(ocorrencia.dataOcorrencia)}
            </span>
            <span>
              <User size={14} aria-hidden="true" /> Registrada por {ocorrencia.autorNome}
            </span>
          </span>
        }
      />

      {feedback && (
        <Alert type={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      <section className={formStyles.card} aria-label="Descrição da ocorrência">
        <div className={styles.content}>{ocorrencia.descricao}</div>
      </section>

      <div className={formStyles.formActions}>
        <Button variant="secondary" to={urlDaLista('/minhas-ocorrencias')} icon={ArrowLeft}>
          Voltar
        </Button>
        {ocorrencia.ciente ? (
          <Badge tone="success">Ciente em {formatDateTime(ocorrencia.cienteEm)}</Badge>
        ) : (
          <Button icon={CheckCircle2} onClick={handleCiencia} loading={saving} loadingText="Registrando...">
            Estou ciente
          </Button>
        )}
      </div>
    </div>
  );
}
