import { ClipboardList, Eye, Plus, RefreshCw, Search, X } from 'lucide-react';
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
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { listOcorrencias, setOcorrenciaAtivo } from '../../services/ocorrenciaService';
import { formatDateOnly, TIPO_OCORRENCIA_OPTIONS, tipoOcorrencia, VERBO_CIENCIA } from '../../utils/formatters';
import styles from '../../styles/ListPage.module.css';

const TIPO_FILTER_OPTIONS = [{ value: '', label: 'Todos os tipos' }, ...TIPO_OCORRENCIA_OPTIONS];
const SITUACAO_OPTIONS = [
  { value: '', label: 'Todas as situações' },
  { value: 'true', label: 'Ativas' },
  { value: 'false', label: 'Arquivadas' },
];
const VER = { label: 'Ver', icon: Eye };

export function OcorrenciasListPage() {
  const [flash, setFlash] = useFlashMessage();
  const list = usePaginatedList(listOcorrencias, { errorMessage: 'Não foi possível carregar as ocorrências.' });
  const { items, pagination, loading, error } = list;

  const toggle = useAtivoToggle({
    setAtivo: setOcorrenciaAtivo,
    successMessage: (o, novoAtivo) => `Ocorrência de ${o.aluno.nome} ${novoAtivo ? 'reativada' : 'arquivada'}.`,
    onDone: (message) => {
      setFlash(message);
      if (message.type === 'success') list.reload();
    },
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Ocorrências"
        description="Registros sobre os alunos, com a ciência dos responsáveis."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Ocorrências' }]}
        actions={
          <Button to="/ocorrencias/nova" icon={Plus}>
            Registrar ocorrência
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
              label="Buscar ocorrências"
              hideLabel
              icon={Search}
              type="search"
              placeholder="Buscar pelo nome do aluno"
              value={list.buscaInput}
              onChange={(event) => list.setBuscaInput(event.target.value)}
              maxLength={100}
            />
          </div>
          <SelectField
            label="Tipo"
            hideLabel
            options={TIPO_FILTER_OPTIONS}
            value={list.searchParams.get('tipo') ?? ''}
            onChange={(event) => list.updateParams({ tipo: event.target.value })}
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
                <th scope="col">Aluno</th>
                <th scope="col">Tipo</th>
                <th scope="col" className={styles.optionalColumn}>
                  Ciência
                </th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((ocorrencia) => {
                const tipo = tipoOcorrencia(ocorrencia.tipo);
                return (
                  <tr key={ocorrencia.id}>
                    <td data-label="Aluno">
                      <div className={styles.userText}>
                        <span className={styles.userName}>{ocorrencia.aluno.nome}</span>
                        <span className={styles.userEmail}>
                          {formatDateOnly(ocorrencia.dataOcorrencia)} · por {ocorrencia.autor.nome}
                        </span>
                      </div>
                    </td>
                    <td data-label="Tipo">
                      <Badge tone={tipo.tone}>{tipo.label}</Badge>
                    </td>
                    <td data-label="Ciência" className={styles.optionalColumn}>
                      {ocorrencia.totalResponsaveis === 0 ? (
                        <span className={styles.muted}>Sem responsável</span>
                      ) : (
                        <ReadProgress
                          lidos={ocorrencia.totalCientes}
                          total={ocorrencia.totalResponsaveis}
                          verbo={VERBO_CIENCIA}
                          compact
                        />
                      )}
                    </td>
                    <td data-label="Situação">
                      <Badge tone={ocorrencia.ativo ? 'success' : 'neutral'}>
                        {ocorrencia.ativo ? 'Ativa' : 'Arquivada'}
                      </Badge>
                    </td>
                    <td className={styles.actionsCell}>
                      <RowActions
                        item={ocorrencia}
                        label={`ocorrência de ${ocorrencia.aluno.nome}`}
                        editTo={`/ocorrencias/${ocorrencia.id}`}
                        editAction={VER}
                        deactivateLabel="Arquivar"
                        toggle={toggle}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && !error && items.length === 0 && (
            <div className={styles.empty}>
              <ClipboardList size={28} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyTitle}>Nenhuma ocorrência encontrada</p>
              <p className={styles.muted}>
                {list.hasFilters ? 'Tente outros filtros ou limpe-os.' : 'Registre a primeira ocorrência.'}
              </p>
            </div>
          )}

          {loading && items.length === 0 && (
            <p className={styles.loadingText}>
              <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando ocorrências...
            </p>
          )}
        </div>

        {pagination && <Pagination {...pagination} disabled={loading} onPageChange={list.goToPage} />}
      </section>

      <ConfirmDialog
        open={toggle.confirmTarget !== null}
        title="Arquivar ocorrência?"
        confirmLabel="Arquivar"
        confirmVariant="danger"
        loading={toggle.busy}
        onCancel={toggle.cancelDeactivate}
        onConfirm={toggle.confirmDeactivate}
      >
        <p>
          A ocorrência de <strong>{toggle.confirmTarget?.aluno.nome}</strong> deixará de aparecer para os
          responsáveis. O registro e as ciências são mantidos.
        </p>
      </ConfirmDialog>
    </div>
  );
}
