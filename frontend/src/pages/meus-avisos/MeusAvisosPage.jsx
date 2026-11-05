import { Bell, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { listMeusAvisos } from '../../services/avisoService';
import { avisoPublicoLabel, formatDateTime } from '../../utils/formatters';
import listStyles from '../../styles/ListPage.module.css';
import styles from '../../styles/Comunicado.module.css';

const FILTROS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Não lidos' },
];

/** Avisos recebidos pelo responsável logado. */
export function MeusAvisosPage() {
  const list = usePaginatedList(listMeusAvisos, { errorMessage: 'Não foi possível carregar seus avisos.' });
  const { items, pagination, loading, error } = list;
  const naoLidos = list.searchParams.get('naoLidos') ?? '';

  return (
    <div className={listStyles.page}>
      <PageHeader
        title="Meus avisos"
        description="Comunicados da escola sobre seus filhos e dependentes."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Meus avisos' }]}
      />

      <div className={styles.tabs} role="group" aria-label="Filtrar avisos">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`${styles.tab} ${naoLidos === f.value ? styles.tabActive : ''}`}
            aria-pressed={naoLidos === f.value}
            onClick={() => list.updateParams({ naoLidos: f.value })}
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
          <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando avisos...
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className={`${listStyles.card} ${listStyles.empty}`}>
          <Bell size={28} className={listStyles.emptyIcon} aria-hidden="true" />
          <p className={listStyles.emptyTitle}>{naoLidos ? 'Nenhum aviso não lido' : 'Nenhum aviso por enquanto'}</p>
          <p className={listStyles.muted}>Quando a escola enviar comunicados, eles aparecem aqui.</p>
        </div>
      )}

      {items.length > 0 && (
        <ul className={`${styles.feed} ${loading ? listStyles.loading : ''}`} aria-busy={loading}>
          {items.map((aviso) => (
            <li key={aviso.id}>
              <Link to={`/meus-avisos/${aviso.id}`} className={`${styles.feedItem} ${aviso.lido ? '' : styles.unread}`}>
                <div className={styles.feedTop}>
                  <span className={styles.feedTitle}>{aviso.titulo}</span>
                  {!aviso.lido && <Badge tone="primary">Novo</Badge>}
                </div>
                <span className={styles.meta}>
                  <span>{avisoPublicoLabel(aviso)}</span>
                  <span>{formatDateTime(aviso.publicadoEm)}</span>
                </span>
                <p className={styles.excerpt}>{aviso.conteudo}</p>
              </Link>
            </li>
          ))}
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
