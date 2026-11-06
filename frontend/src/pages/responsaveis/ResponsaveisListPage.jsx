import { Pencil, RefreshCw, Search, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { SelectField } from '../../components/SelectField';
import { TextField } from '../../components/TextField';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { useRelatorio } from '../../hooks/useRelatorio';
import { getPendenciasResponsaveis, listResponsaveis } from '../../services/responsavelService';
import { ATIVO_FILTER_OPTIONS, maskTelefone } from '../../utils/formatters';
import styles from '../../styles/ListPage.module.css';
import respStyles from '../../styles/Responsaveis.module.css';

const VINCULO_OPTIONS = [
  { value: '', label: 'Todos os vínculos' },
  { value: 'true', label: 'Sem aluno vinculado' },
];

const carregarPendencias = (_params, options) => getPendenciasResponsaveis(options);
const SEM_PARAMS = {};

/** Alerta: alunos ativos cuja família não recebe avisos, ocorrências nem boletim. */
function AlertaPendencias() {
  const { data } = useRelatorio(carregarPendencias, SEM_PARAMS, 'Não foi possível verificar os alunos sem responsável.');
  const [aberto, setAberto] = useState(false);
  if (!data || data.total === 0) return null;

  const plural = data.total === 1 ? 'aluno ativo não tem' : 'alunos ativos não têm';
  return (
    <Alert type="warning">
      <strong>
        {data.total} {plural} responsável que receba comunicações.
      </strong>{' '}
      A família não recebe avisos, ocorrências nem boletim.{' '}
      <button type="button" className={respStyles.toggle} onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>
        {aberto ? 'Ocultar alunos' : 'Ver alunos'}
      </button>
      {aberto && (
        <ul className={respStyles.pendencias}>
          {data.alunos.map((aluno) => (
            <li key={aluno.id}>
              <Link to={`/alunos/${aluno.id}/editar`}>{aluno.nome}</Link>{' '}
              <span className={respStyles.pendenciaNota}>
                ({aluno.turmaAtual ?? 'sem turma'} ·{' '}
                {aluno.totalVinculos === 0 ? 'nenhum responsável vinculado' : 'vínculo sem autorização ou responsável inativo'})
              </span>
            </li>
          ))}
          {data.total > data.alunos.length && <li>e mais {data.total - data.alunos.length}.</li>}
        </ul>
      )}
    </Alert>
  );
}

/**
 * Responsáveis (ADMIN): consulta com os alunos de cada um. Cadastro e dados pessoais ficam
 * em Usuários; vínculos (parentesco, principal, autorização) na tela do aluno.
 */
export function ResponsaveisListPage() {
  const list = usePaginatedList(listResponsaveis, { errorMessage: 'Não foi possível carregar os responsáveis.' });
  const { items, pagination, loading, error } = list;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Responsáveis"
        description="Famílias e os alunos de cada uma. Dados pessoais em Usuários; vínculos na tela do aluno."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Responsáveis' }]}
        actions={
          <Button to="/usuarios/novo?tipo=RESPONSAVEL" icon={UserPlus}>
            Novo responsável
          </Button>
        }
      />

      <AlertaPendencias />

      <section className={styles.card}>
        <div className={styles.filters} role="search">
          <div className={styles.search}>
            <TextField
              label="Buscar responsáveis"
              hideLabel
              icon={Search}
              type="search"
              placeholder="Buscar por nome ou e-mail"
              value={list.buscaInput}
              onChange={(event) => list.setBuscaInput(event.target.value)}
              maxLength={100}
            />
          </div>
          <SelectField
            label="Vínculos"
            hideLabel
            options={VINCULO_OPTIONS}
            value={list.searchParams.get('semAluno') ?? ''}
            onChange={(event) => list.updateParams({ semAluno: event.target.value })}
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
                <th scope="col">Responsável</th>
                <th scope="col">Telefone</th>
                <th scope="col">Alunos</th>
                <th scope="col">Situação</th>
                <th scope="col">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ usuario, telefone, alunos }) => (
                <tr key={usuario.id}>
                  <td data-label="Responsável">
                    <div className={styles.userText}>
                      <span className={styles.userName}>{usuario.nome}</span>
                      <span className={styles.userEmail}>{usuario.email}</span>
                    </div>
                  </td>
                  <td data-label="Telefone">{telefone ? maskTelefone(telefone) : '—'}</td>
                  <td data-label="Alunos">
                    {alunos.length === 0 ? (
                      <span className={respStyles.semAluno}>Nenhum aluno vinculado</span>
                    ) : (
                      <ul className={respStyles.alunos}>
                        {alunos.map((aluno) => (
                          <li key={aluno.id} className={respStyles.aluno}>
                            <Link to={`/alunos/${aluno.id}/editar`}>{aluno.nome}</Link>
                            <span className={respStyles.parentesco}>({aluno.parentesco})</span>
                            {aluno.principal && <Badge tone="primary">Principal</Badge>}
                            {!aluno.autorizado && <Badge tone="warning">Não recebe comunicações</Badge>}
                            {!aluno.ativo && <Badge tone="neutral">Aluno inativo</Badge>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td data-label="Situação">
                    <Badge tone={usuario.ativo ? 'success' : 'danger'}>{usuario.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </td>
                  <td className={styles.actionsCell}>
                    <div className={styles.rowActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Pencil}
                        to={`/usuarios/${usuario.id}/editar`}
                        aria-label={`Editar dados de ${usuario.nome}`}
                        title="Editar dados"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && !error && items.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Nenhum responsável encontrado</p>
              <p className={styles.muted}>
                {list.hasFilters
                  ? 'Tente outros termos ou limpe os filtros.'
                  : 'Cadastre em Usuários (perfil Responsável) e vincule na tela do aluno.'}
              </p>
            </div>
          )}

          {loading && items.length === 0 && (
            <p className={styles.loadingText}>
              <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando responsáveis...
            </p>
          )}
        </div>

        {pagination && <Pagination {...pagination} disabled={loading} onPageChange={list.goToPage} />}
      </section>
    </div>
  );
}
