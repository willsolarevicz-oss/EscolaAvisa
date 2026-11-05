import { Eye, Megaphone, Plus, RefreshCw, Search, X } from 'lucide-react';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { ReadProgress } from '../../components/ReadProgress';
import { RowActions } from '../../components/RowActions';
import { SelectField } from '../../components/SelectField';
import { TextField } from '../../components/TextField';
import { useAtivoToggle } from '../../hooks/useAtivoToggle';
import { useAuth } from '../../hooks/useAuth';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { listAvisos, setAvisoAtivo } from '../../services/avisoService';
import { avisoPublicoLabel, formatDateTime, PUBLICO_OPTIONS } from '../../utils/formatters';
import styles from '../../styles/ListPage.module.css';

const PUBLICO_FILTER_OPTIONS = [{ value: '', label: 'Todos os públicos' }, ...PUBLICO_OPTIONS];
const SITUACAO_OPTIONS = [
  { value: '', label: 'Todas as situações' },
  { value: 'true', label: 'Publicados' },
  { value: 'false', label: 'Arquivados' },
];
const VER = { label: 'Ver', icon: Eye };

export function AvisosListPage() {
  const { user } = useAuth();
  const isProfessor = user.tipoUsuario === 'PROFESSOR';
  const [flash, setFlash] = useFlashMessage();
  const list = usePaginatedList(listAvisos, { errorMessage: 'Não foi possível carregar os avisos.' });
  const { items, pagination, loading, error } = list;

  const toggle = useAtivoToggle({
    setAtivo: setAvisoAtivo,
    successMessage: (aviso, novoAtivo) => `Aviso "${aviso.titulo}" ${novoAtivo ? 'reativado' : 'arquivado'}.`,
    onDone: (message) => {
      setFlash(message);
      if (message.type === 'success') list.reload();
    },
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Avisos"
        description={
          isProfessor
            ? 'Seus comunicados para as turmas em que você leciona, com o controle de quem já leu.'
            : 'Comunicados para os responsáveis, com o controle de quem já leu.'
        }
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Avisos' }]}
        actions={
          <Button to="/avisos/novo" icon={Plus}>
            Novo aviso
          </Button>
        }
      />

      {flash && (
        <Alert type={flash.type} onClose={() => setFlash(null)}>
          {flash.message}
        </Alert>
      )}

      <section className={styles.card}>
        <div className={styles.filters} role="search">
          <div className={styles.search}>
            <TextField
              label="Buscar avisos"
              hideLabel
              icon={Search}
              type="search"
              placeholder="Buscar pelo título"
              value={list.buscaInput}
              onChange={(event) => list.setBuscaInput(event.target.value)}
              maxLength={100}
            />
          </div>
          <SelectField
            label="Público"
            hideLabel
            options={PUBLICO_FILTER_OPTIONS}
            value={list.searchParams.get('publico') ?? ''}
            onChange={(event) => list.updateParams({ publico: event.target.value })}
          />
          <SelectField
            label="Situação"
            hideLabel
            options={SITUACAO_OPTIONS}
            value={list.searchParams.get('ativo') ?? ''}
            onChange={(event) => list.updateParams({ ativo: event.target.value })}
          />
          {list.hasFilters && (
            <Button variant="ghost" icon={X} onClick={list.clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>

        {error && (
          <div className={styles.feedback}>
            <Alert type="error">
              {error}{' '}
              <button type="button" className={styles.linkButton} onClick={list.reload}>
                Tentar novamente
              </button>
            </Alert>
          </div>
        )}

        <div className={`${styles.tableWrap} ${loading ? styles.loading : ''}`} aria-busy={loading}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Aviso</th>
                <th scope="col">Leitura</th>
                <th scope="col" className={styles.optionalColumn}>
                  Publicado em
                </th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((aviso) => (
                <tr key={aviso.id}>
                  <td data-label="Aviso">
                    <div className={styles.userText}>
                      <span className={styles.userName}>{aviso.titulo}</span>
                      <span className={styles.userEmail}>
                        {avisoPublicoLabel(aviso)}
                        {!isProfessor && ` · por ${aviso.autor.nome}`}
                      </span>
                    </div>
                  </td>
                  <td data-label="Leitura">
                    <ReadProgress lidos={aviso.totalLidos} total={aviso.totalDestinatarios} compact />
                  </td>
                  <td data-label="Publicado em" className={`${styles.muted} ${styles.optionalColumn}`}>
                    {formatDateTime(aviso.publicadoEm)}
                  </td>
                  <td data-label="Situação">
                    <Badge tone={aviso.ativo ? 'success' : 'neutral'}>{aviso.ativo ? 'Publicado' : 'Arquivado'}</Badge>
                  </td>
                  <td className={styles.actionsCell}>
                    <RowActions
                      item={aviso}
                      label={aviso.titulo}
                      editTo={`/avisos/${aviso.id}`}
                      editAction={VER}
                      deactivateLabel="Arquivar"
                      toggle={toggle}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && !error && items.length === 0 && (
            <div className={styles.empty}>
              <Megaphone size={28} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyTitle}>Nenhum aviso encontrado</p>
              <p className={styles.muted}>
                {list.hasFilters ? 'Tente outros filtros ou limpe-os.' : 'Publique o primeiro aviso.'}
              </p>
            </div>
          )}

          {loading && items.length === 0 && (
            <p className={styles.loadingText}>
              <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando avisos...
            </p>
          )}
        </div>

        {pagination && <Pagination {...pagination} disabled={loading} onPageChange={list.goToPage} />}
      </section>

      <ConfirmDialog
        open={toggle.confirmTarget !== null}
        title="Arquivar aviso?"
        confirmLabel="Arquivar"
        confirmVariant="danger"
        loading={toggle.busy}
        onCancel={toggle.cancelDeactivate}
        onConfirm={toggle.confirmDeactivate}
      >
        <p>
          <strong>{toggle.confirmTarget?.titulo}</strong> deixará de aparecer para os responsáveis. O histórico de
          leitura é mantido e você pode reativar depois.
        </p>
      </ConfirmDialog>
    </div>
  );
}
