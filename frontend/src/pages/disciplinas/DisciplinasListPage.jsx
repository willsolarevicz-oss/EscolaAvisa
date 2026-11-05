import { BookOpen, Plus, RefreshCw, Search, X } from 'lucide-react';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { RowActions } from '../../components/RowActions';
import { SelectField } from '../../components/SelectField';
import { TextField } from '../../components/TextField';
import { useAtivoToggle } from '../../hooks/useAtivoToggle';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { listDisciplinas, setDisciplinaAtivo } from '../../services/disciplinaService';
import { ATIVO_FILTER_OPTIONS } from '../../utils/formatters';
import styles from '../../styles/ListPage.module.css';

export function DisciplinasListPage() {
  const [flash, setFlash] = useFlashMessage();
  const list = usePaginatedList(listDisciplinas, { errorMessage: 'Não foi possível carregar as disciplinas.' });
  const { items, pagination, loading, error } = list;

  const toggle = useAtivoToggle({
    setAtivo: setDisciplinaAtivo,
    successMessage: (disciplina, novoAtivo) => `Disciplina ${disciplina.nome} ${novoAtivo ? 'reativada' : 'desativada'}.`,
    onDone: (message) => {
      setFlash(message);
      if (message.type === 'success') list.reload();
    },
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Disciplinas"
        description="Matérias lecionadas na escola. Usadas ao atribuir professores às turmas."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Disciplinas' }]}
        actions={
          <Button to="/disciplinas/nova" icon={Plus}>
            Nova disciplina
          </Button>
        }
      />

      {flash && (
        <Alert type={flash.type} onClose={() => setFlash(null)}>
          {flash.message}
        </Alert>
      )}

      <section className={styles.card}>
        <div className={`${styles.filters} ${styles.filtersCompact}`} role="search">
          <div className={styles.search}>
            <TextField
              label="Buscar disciplinas"
              hideLabel
              icon={Search}
              type="search"
              placeholder="Buscar por nome"
              value={list.buscaInput}
              onChange={(event) => list.setBuscaInput(event.target.value)}
              maxLength={100}
            />
          </div>
          <SelectField
            label="Situação"
            hideLabel
            options={ATIVO_FILTER_OPTIONS}
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
                <th scope="col">Disciplina</th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((disciplina) => (
                <tr key={disciplina.id}>
                  <td data-label="Disciplina">
                    <div className={styles.userText}>
                      <span className={styles.userName}>{disciplina.nome}</span>
                      {disciplina.descricao && <span className={styles.userEmail}>{disciplina.descricao}</span>}
                    </div>
                  </td>
                  <td data-label="Situação">
                    <Badge tone={disciplina.ativo ? 'success' : 'danger'}>{disciplina.ativo ? 'Ativa' : 'Inativa'}</Badge>
                  </td>
                  <td className={styles.actionsCell}>
                    <RowActions
                      item={disciplina}
                      label={disciplina.nome}
                      editTo={`/disciplinas/${disciplina.id}/editar`}
                      toggle={toggle}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && !error && items.length === 0 && (
            <div className={styles.empty}>
              <BookOpen size={28} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyTitle}>Nenhuma disciplina encontrada</p>
              <p className={styles.muted}>
                {list.hasFilters ? 'Tente outros termos ou limpe os filtros.' : 'Cadastre a primeira disciplina.'}
              </p>
            </div>
          )}

          {loading && items.length === 0 && (
            <p className={styles.loadingText}>
              <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando disciplinas...
            </p>
          )}
        </div>

        {pagination && <Pagination {...pagination} disabled={loading} onPageChange={list.goToPage} />}
      </section>

      <ConfirmDialog
        open={toggle.confirmTarget !== null}
        title="Desativar disciplina?"
        confirmLabel="Desativar"
        confirmVariant="danger"
        loading={toggle.busy}
        onCancel={toggle.cancelDeactivate}
        onConfirm={toggle.confirmDeactivate}
      >
        <p>
          <strong>{toggle.confirmTarget?.nome}</strong> não poderá mais ser atribuída a professores. As atribuições
          existentes são mantidas.
        </p>
      </ConfirmDialog>
    </div>
  );
}
