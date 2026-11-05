import { Archive, ArchiveRestore, ArrowLeft, CalendarDays, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { ReadProgress } from '../../components/ReadProgress';
import { useAuth } from '../../hooks/useAuth';
import { useEntityLoader } from '../../hooks/useEntityLoader';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { getApiErrorMessage } from '../../services/api';
import { getOcorrencia, setOcorrenciaAtivo } from '../../services/ocorrenciaService';
import { formatDateOnly, formatDateTime, tipoOcorrencia, VERBO_CIENCIA } from '../../utils/formatters';
import formStyles from '../../styles/FormPage.module.css';
import styles from '../../styles/Comunicado.module.css';
import { urlDaLista } from '../../utils/listaMemoria';

export function OcorrenciaDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [flash, setFlash] = useFlashMessage();
  const loader = useEntityLoader(getOcorrencia, id, { errorMessage: 'Não foi possível carregar a ocorrência.' });
  const ocorrencia = loader.data;

  const [confirmArchive, setConfirmArchive] = useState(false);
  const [saving, setSaving] = useState(false);

  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Ocorrências', to: urlDaLista('/ocorrencias') },
    { label: ocorrencia ? `${tipoOcorrencia(ocorrencia.tipo).label} — ${ocorrencia.aluno.nome}` : 'Ocorrência' },
  ];

  async function changeAtivo(ativo) {
    setSaving(true);
    try {
      const atualizada = await setOcorrenciaAtivo(id, ativo);
      loader.setData((prev) => ({ ...prev, ativo: atualizada.ativo }));
      setFlash({
        type: 'success',
        message: ativo ? 'Ocorrência reativada.' : 'Ocorrência arquivada: os responsáveis não a veem mais.',
      });
    } catch (error) {
      setFlash({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível alterar a ocorrência.') });
    } finally {
      setSaving(false);
      setConfirmArchive(false);
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
            <Alert type="error">{loader.status === 'notfound' ? 'Ocorrência não encontrada.' : loader.errorMessage}</Alert>
            <div className={formStyles.formActions}>
              <Button to={urlDaLista('/ocorrencias')} icon={ArrowLeft}>
                Voltar para ocorrências
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  const tipo = tipoOcorrencia(ocorrencia.tipo);
  const cientes = ocorrencia.ciencias.filter((c) => c.ciente).length;
  // O link para o aluno só faz sentido para quem acessa o cadastro de alunos (ADMIN).
  const alunoNome =
    user.tipoUsuario === 'ADMIN' ? (
      <Link to={`/alunos/${ocorrencia.aluno.id}/editar`}>{ocorrencia.aluno.nome}</Link>
    ) : (
      ocorrencia.aluno.nome
    );

  return (
    <div className={formStyles.page}>
      <PageHeader
        title={`Ocorrência — ${ocorrencia.aluno.nome}`}
        breadcrumbs={breadcrumbs}
        description={
          <span className={styles.meta}>
            <Badge tone={tipo.tone}>{tipo.label}</Badge>
            <span>
              <CalendarDays size={14} aria-hidden="true" /> {formatDateOnly(ocorrencia.dataOcorrencia)}
            </span>
            <span>
              <User size={14} aria-hidden="true" /> Aluno: {alunoNome} · registrada por {ocorrencia.autor.nome}
            </span>
          </span>
        }
        actions={
          ocorrencia.ativo ? (
            <Button variant="danger" icon={Archive} onClick={() => setConfirmArchive(true)} disabled={saving}>
              Arquivar
            </Button>
          ) : (
            <Button variant="secondary" icon={ArchiveRestore} onClick={() => changeAtivo(true)} loading={saving}>
              Reativar
            </Button>
          )
        }
      />

      {flash && (
        <Alert type={flash.type} onClose={() => setFlash(null)}>
          {flash.message}
        </Alert>
      )}
      {!ocorrencia.ativo && <Alert type="warning">Ocorrência arquivada: os responsáveis não a veem mais.</Alert>}

      <section className={formStyles.card} aria-label="Descrição da ocorrência">
        <div className={styles.content}>{ocorrencia.descricao}</div>
      </section>

      <section className={formStyles.card} aria-labelledby="ciencia-title">
        <div className={formStyles.cardHeader}>
          <h3 id="ciencia-title" className={formStyles.cardTitle}>
            Ciência dos responsáveis
          </h3>
          {ocorrencia.ciencias.length > 0 && (
            <ReadProgress lidos={cientes} total={ocorrencia.ciencias.length} verbo={VERBO_CIENCIA} />
          )}
        </div>
        <div className={styles.readers}>
          {ocorrencia.ciencias.length === 0 ? (
            <p className={formStyles.muted}>
              O aluno não tinha responsável ativo e autorizado a receber comunicações quando a ocorrência foi registrada.
            </p>
          ) : (
            <ul className={styles.readerList}>
              {ocorrencia.ciencias.map((c) => (
                <li key={c.usuario.id} className={styles.reader}>
                  <div className={styles.readerText}>
                    <strong>{c.usuario.nome}</strong>
                    <span>{c.usuario.email}</span>
                  </div>
                  {c.ciente ? (
                    <Badge tone="success">Ciente em {formatDateTime(c.cienteEm)}</Badge>
                  ) : (
                    <Badge tone="warning">Aguardando ciência</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirmArchive}
        title="Arquivar ocorrência?"
        confirmLabel="Arquivar"
        confirmVariant="danger"
        loading={saving}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => changeAtivo(false)}
      >
        <p>A ocorrência deixará de aparecer para os responsáveis. O registro e as ciências são mantidos.</p>
      </ConfirmDialog>
    </div>
  );
}
