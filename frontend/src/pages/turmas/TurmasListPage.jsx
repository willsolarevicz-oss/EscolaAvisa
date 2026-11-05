import { Plus, RefreshCw, School, Search, X } from 'lucide-react';
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
import { listTurmas, setTurmaAtivo } from '../../services/turmaService';
import { anoLetivoOptions, ATIVO_FILTER_OPTIONS, TURNO_OPTIONS, turnoLabel } from '../../utils/formatters';
import styles from '../../styles/ListPage.module.css';

const ANO_OPTIONS = [{ value: '', label: 'Todos os anos' }, ...anoLetivoOptions()];
const TURNO_FILTER_OPTIONS = [{ value: '', label: 'Todos os turnos' }, ...TURNO_OPTIONS];

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function TurmasListPage() {
  const [flash, setFlash] = useFlashMessage();
  const list = usePaginatedList(listTurmas, { errorMessage: 'Não foi possível carregar as turmas.' });
  const { items, pagination, loading, error } = list;

  const toggle = useAtivoToggle({
    setAtivo: setTurmaAtivo,
    successMessage: (turma, novoAtivo) => `Turma ${turma.nome} ${novoAtivo ? 'reativada' : 'desativada'}.`,
    onDone: (message) => {
      setFlash(message);
      if (message.type === 'success') list.reload();
    },
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Turmas"
        description="Turmas por ano letivo, com alunos matriculados e professores de cada disciplina."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Turmas' }]}
        actions={
          <Button to="/turmas/nova" icon={Plus}>
            Nova turma
          </Button>
        }
      />

      {flash && (
        <Alert type={flash.type} onClose={() => setFlash(null)}>
          {flash.message}
        </Alert>
      )}

      <section className={styles.card}>
        <div className={`${styles.filters} ${styles.filtersWide}`} role="search">
          <div className={styles.search}>
            <TextField
              label="Buscar turmas"
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
            label="Ano letivo"
            hideLabel
            options={ANO_OPTIONS}
            value={list.searchParams.get('anoLetivo') ?? ''}
            onChange={(event) => list.updateParams({ anoLetivo: event.target.value })}
          />
          <SelectField
            label="Turno"
            hideLabel
            options={TURNO_FILTER_OPTIONS}
            value={list.searchParams.get('turno') ?? ''}
            onChange={(event) => list.updateParams({ turno: event.target.value })}
          />
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
                <th scope="col">Turma</th>
                <th scope="col">Alunos</th>
                <th scope="col" className={styles.optionalColumn}>
                  Professores
                </th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((turma) => (
                <tr key={turma.id}>
                  <td data-label="Turma">
                    <div className={styles.userText}>
                      <span className={styles.userName}>{turma.nome}</span>
                      <span className={styles.userEmail}>
                        {turma.anoLetivo} · {turnoLabel(turma.turno)}
                      </span>
                    </div>
                  </td>
                  <td data-label="Alunos">
                    {turma.totalAlunos === 0 ? (
                      <Badge tone="warning">Sem alunos</Badge>
                    ) : (
                      <Badge tone="neutral">{plural(turma.totalAlunos, 'aluno', 'alunos')}</Badge>
                    )}
                  </td>
                  <td data-label="Professores" className={`${styles.muted} ${styles.optionalColumn}`}>
                    {turma.totalProfessores === 0 ? '—' : plural(turma.totalProfessores, 'professor', 'professores')}
                  </td>
                  <td data-label="Situação">
                    <Badge tone={turma.ativo ? 'success' : 'danger'}>{turma.ativo ? 'Ativa' : 'Inativa'}</Badge>
                  </td>
                  <td className={styles.actionsCell}>
                    <RowActions item={turma} label={turma.nome} editTo={`/turmas/${turma.id}/editar`} toggle={toggle} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && !error && items.length === 0 && (
            <div className={styles.empty}>
              <School size={28} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyTitle}>Nenhuma turma encontrada</p>
              <p className={styles.muted}>
                {list.hasFilters ? 'Tente outros filtros ou limpe-os.' : 'Cadastre a primeira turma.'}
              </p>
            </div>
          )}

          {loading && items.length === 0 && (
            <p className={styles.loadingText}>
              <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando turmas...
            </p>
          )}
        </div>

        {pagination && <Pagination {...pagination} disabled={loading} onPageChange={list.goToPage} />}
      </section>

      <ConfirmDialog
        open={toggle.confirmTarget !== null}
        title="Desativar turma?"
        confirmLabel="Desativar"
        confirmVariant="danger"
        loading={toggle.busy}
        onCancel={toggle.cancelDeactivate}
        onConfirm={toggle.confirmDeactivate}
      >
        <p>
          A turma <strong>{toggle.confirmTarget?.nome}</strong> deixa de aceitar matrículas e atribuições. Alunos e
          professores já vinculados continuam registrados.
        </p>
      </ConfirmDialog>
    </div>
  );
}
