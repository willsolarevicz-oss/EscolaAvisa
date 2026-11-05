import { ClipboardList, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { listMinhasOcorrencias } from '../../services/ocorrenciaService';
import { formatDateOnly, tipoOcorrencia } from '../../utils/formatters';
import listStyles from '../../styles/ListPage.module.css';
import styles from '../../styles/Comunicado.module.css';

const FILTROS = [
  { value: '', label: 'Todas' },
  { value: 'true', label: 'Aguardando ciência' },
];

/** Ocorrências sobre os alunos do responsável logado. */
export function MinhasOcorrenciasPage() {
  const list = usePaginatedList(listMinhasOcorrencias, { errorMessage: 'Não foi possível carregar as ocorrências.' });
  const { items, pagination, loading, error } = list;
  const pendentes = list.searchParams.get('pendentes') ?? '';

  return (
    <div className={listStyles.page}>
      <PageHeader
        title="Minhas ocorrências"
        description="Registros da escola sobre seus filhos e dependentes. Confirme que está ciente de cada um."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Minhas ocorrências' }]}
      />

      <div className={styles.tabs} role="group" aria-label="Filtrar ocorrências">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`${styles.tab} ${pendentes === f.value ? styles.tabActive : ''}`}
            aria-pressed={pendentes === f.value}
            onClick={() => list.updateParams({ pendentes: f.value })}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <Alert type="error">
          {error}{' '}
          <button type="button" className={listStyles.linkButton} onClick={list.reload}>
            Tentar novamente
          </button>
        </Alert>
      )}

      {loading && items.length === 0 && (
        <p className={listStyles.loadingText}>
          <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando ocorrências...
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className={`${listStyles.card} ${listStyles.empty}`}>
          <ClipboardList size={28} className={listStyles.emptyIcon} aria-hidden="true" />
          <p className={listStyles.emptyTitle}>
            {pendentes ? 'Nenhuma ocorrência aguardando ciência' : 'Nenhuma ocorrência registrada'}
          </p>
          <p className={listStyles.muted}>Quando a escola registrar uma ocorrência, ela aparece aqui.</p>
        </div>
      )}

      {items.length > 0 && (
        <ul className={`${styles.feed} ${loading ? listStyles.loading : ''}`} aria-busy={loading}>
          {items.map((ocorrencia) => {
            const tipo = tipoOcorrencia(ocorrencia.tipo);
            return (
              <li key={ocorrencia.id}>
                <Link
                  to={`/minhas-ocorrencias/${ocorrencia.id}`}
                  className={`${styles.feedItem} ${ocorrencia.ciente ? '' : styles.unread}`}
                >
                  <div className={styles.feedTop}>
                    <span className={styles.feedTitle}>{ocorrencia.alunoNome}</span>
                    {!ocorrencia.ciente && <Badge tone="warning">Aguardando ciência</Badge>}
                  </div>
                  <span className={styles.meta}>
                    <Badge tone={tipo.tone}>{tipo.label}</Badge>
                    <span>{formatDateOnly(ocorrencia.dataOcorrencia)}</span>
                  </span>
                  <p className={styles.excerpt}>{ocorrencia.descricao}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pagination && pagination.total > 0 && (
        <div className={listStyles.card}>
          <Pagination {...pagination} disabled={loading} onPageChange={list.goToPage} />
        </div>
      )}
    </div>
  );
}
