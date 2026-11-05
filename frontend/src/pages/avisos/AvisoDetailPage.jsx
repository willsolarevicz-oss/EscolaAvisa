import { Archive, ArchiveRestore, ArrowLeft, CalendarDays, Users } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { ReadProgress } from '../../components/ReadProgress';
import { useEntityLoader } from '../../hooks/useEntityLoader';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { getApiErrorMessage } from '../../services/api';
import { getAviso, setAvisoAtivo } from '../../services/avisoService';
import { avisoPublicoLabel, formatDateTime } from '../../utils/formatters';
import formStyles from '../../styles/FormPage.module.css';
import styles from './Aviso.module.css';

const FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'naoLidos', label: 'Não leram' },
  { value: 'lidos', label: 'Leram' },
];

export function AvisoDetailPage() {
  const { id } = useParams();
  const [flash, setFlash] = useFlashMessage();
  const loader = useEntityLoader(getAviso, id, { errorMessage: 'Não foi possível carregar o aviso.' });
  const aviso = loader.data;

  const [filtro, setFiltro] = useState('todos');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [saving, setSaving] = useState(false);

  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Avisos', to: '/avisos' },
    { label: aviso?.titulo ?? 'Aviso' },
  ];

  async function changeAtivo(ativo) {
    setSaving(true);
    try {
      const atualizado = await setAvisoAtivo(id, ativo);
      // Mantém a lista de destinatários já carregada; só a situação muda.
      loader.setData((prev) => ({ ...prev, ativo: atualizado.ativo }));
      setFlash({
        type: 'success',
        message: ativo ? 'Aviso reativado: os responsáveis voltam a vê-lo.' : 'Aviso arquivado: os responsáveis não o veem mais.',
      });
    } catch (error) {
      setFlash({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível alterar o aviso.') });
    } finally {
      setSaving(false);
      setConfirmArchive(false);
    }
  }

  if (loader.status !== 'ready') {
    return (
      <div className={formStyles.page}>
        <PageHeader title="Aviso" breadcrumbs={breadcrumbs} />
        {loader.status === 'loading' ? (
          <p className={formStyles.muted}>Carregando aviso...</p>
        ) : (
          <>
            <Alert type="error">{loader.status === 'notfound' ? 'Aviso não encontrado.' : loader.errorMessage}</Alert>
            <div className={formStyles.formActions}>
              {loader.status === 'error' && (
                <Button variant="secondary" onClick={loader.reload}>
                  Tentar novamente
                </Button>
              )}
              <Button to="/avisos" icon={ArrowLeft}>
                Voltar para avisos
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  const destinatarios = aviso.destinatarios.filter((d) =>
    filtro === 'lidos' ? d.lido : filtro === 'naoLidos' ? !d.lido : true,
  );
  const totalLidos = aviso.destinatarios.filter((d) => d.lido).length;

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
              <CalendarDays size={14} aria-hidden="true" /> {formatDateTime(aviso.publicadoEm)} · por {aviso.autor.nome}
            </span>
          </span>
        }
        actions={
          aviso.ativo ? (
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
      {!aviso.ativo && <Alert type="warning">Aviso arquivado: os responsáveis não o veem mais.</Alert>}

      <section className={formStyles.card} aria-label="Conteúdo do aviso">
        <div className={styles.content}>{aviso.conteudo}</div>
      </section>

      <section className={formStyles.card} aria-labelledby="leitura-title">
        <div className={formStyles.cardHeader}>
          <h3 id="leitura-title" className={formStyles.cardTitle}>
            Controle de leitura
          </h3>
          <ReadProgress lidos={totalLidos} total={aviso.destinatarios.length} />
        </div>
        <div className={styles.readers}>
          <div className={styles.tabs} role="group" aria-label="Filtrar destinatários">
            {FILTROS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`${styles.tab} ${filtro === f.value ? styles.tabActive : ''}`}
                aria-pressed={filtro === f.value}
                onClick={() => setFiltro(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {destinatarios.length === 0 ? (
            <p className={formStyles.muted}>
              {filtro === 'naoLidos' ? 'Todos os destinatários já leram.' : 'Ninguém leu ainda.'}
            </p>
          ) : (
            <ul className={styles.readerList}>
              {destinatarios.map((d) => (
                <li key={d.usuario.id} className={styles.reader}>
                  <div className={styles.readerText}>
                    <strong>{d.usuario.nome}</strong>
                    <span>{d.usuario.email}</span>
                  </div>
                  {d.lido ? (
                    <Badge tone="success">Leu em {formatDateTime(d.visualizadoEm)}</Badge>
                  ) : (
                    <Badge tone="warning">Não leu</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirmArchive}
        title="Arquivar aviso?"
        confirmLabel="Arquivar"
        confirmVariant="danger"
        loading={saving}
        onCancel={() => setConfirmArchive(false)}
        onConfirm={() => changeAtivo(false)}
      >
        <p>O aviso deixará de aparecer para os responsáveis. O histórico de leitura é mantido.</p>
      </ConfirmDialog>
    </div>
  );
}
