import { GraduationCap, RefreshCw, Search, UserPlus, X } from 'lucide-react';
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
import { listAlunos, setAlunoAtivo } from '../../services/alunoService';
import { ATIVO_FILTER_OPTIONS, calcAge, formatDateOnly, getInitials } from '../../utils/formatters';
import styles from '../../styles/ListPage.module.css';

function ResponsaveisBadge({ total }) {
  if (total === 0) return <Badge tone="warning">Sem responsável</Badge>;
  return <Badge tone="neutral">{total === 1 ? '1 responsável' : `${total} responsáveis`}</Badge>;
}

export function AlunosListPage() {
  const [flash, setFlash] = useFlashMessage();
  const list = usePaginatedList(listAlunos, { errorMessage: 'Não foi possível carregar os alunos.' });
  const { items, pagination, loading, error } = list;

  const toggle = useAtivoToggle({
    setAtivo: setAlunoAtivo,
    successMessage: (aluno, novoAtivo) => `Cadastro de ${aluno.nome} ${novoAtivo ? 'reativado' : 'desativado'}.`,
    onDone: (message) => {
      setFlash(message);
      if (message.type === 'success') list.reload();
    },
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Alunos"
        description="Cadastro de alunos e dos responsáveis por cada um."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Alunos' }]}
        actions={
          <Button to="/alunos/novo" icon={UserPlus}>
            Novo aluno
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
              label="Buscar alunos"
              hideLabel
              icon={Search}
              type="search"
              placeholder="Buscar por nome ou matrícula"
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
                <th scope="col">Aluno</th>
                <th scope="col" className={styles.optionalColumn}>
                  Nascimento
                </th>
                <th scope="col">Responsáveis</th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((aluno) => {
                const idade = calcAge(aluno.dataNascimento);
                return (
                  <tr key={aluno.id}>
                    <td data-label="Aluno">
                      <div className={styles.userCell}>
                        <span className={styles.avatar} aria-hidden="true">
                          {getInitials(aluno.nome)}
                        </span>
                        <div className={styles.userText}>
                          <span className={styles.userName}>{aluno.nome}</span>
                          <span className={styles.userEmail}>Matrícula {aluno.matricula}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Nascimento" className={`${styles.muted} ${styles.optionalColumn}`}>
                      {formatDateOnly(aluno.dataNascimento)}
                      {idade !== null && ` (${idade} ${idade === 1 ? 'ano' : 'anos'})`}
                    </td>
                    <td data-label="Responsáveis">
                      <ResponsaveisBadge total={aluno.totalResponsaveis} />
                    </td>
                    <td data-label="Situação">
                      <Badge tone={aluno.ativo ? 'success' : 'danger'}>{aluno.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className={styles.actionsCell}>
                      <RowActions item={aluno} label={aluno.nome} editTo={`/alunos/${aluno.id}/editar`} toggle={toggle} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && !error && items.length === 0 && (
            <div className={styles.empty}>
              <GraduationCap size={28} className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyTitle}>Nenhum aluno encontrado</p>
              <p className={styles.muted}>
                {list.hasFilters ? 'Tente outros termos ou limpe os filtros.' : 'Cadastre o primeiro aluno.'}
              </p>
            </div>
          )}

          {loading && items.length === 0 && (
            <p className={styles.loadingText}>
              <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando alunos...
            </p>
          )}
        </div>

        {pagination && <Pagination {...pagination} disabled={loading} onPageChange={list.goToPage} />}
      </section>

      <ConfirmDialog
        open={toggle.confirmTarget !== null}
        title="Desativar aluno?"
        confirmLabel="Desativar"
        confirmVariant="danger"
        loading={toggle.busy}
        onCancel={toggle.cancelDeactivate}
        onConfirm={toggle.confirmDeactivate}
      >
        <p>
          O cadastro de <strong>{toggle.confirmTarget?.nome}</strong> ficará inativo. Os dados e os vínculos com
          responsáveis são mantidos, e você pode reativar depois.
        </p>
      </ConfirmDialog>
    </div>
  );
}
