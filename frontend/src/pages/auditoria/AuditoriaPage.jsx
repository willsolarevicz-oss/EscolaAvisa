import { RefreshCw, Search, X } from 'lucide-react';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { SelectField } from '../../components/SelectField';
import { TextField } from '../../components/TextField';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { listAuditoria } from '../../services/auditoriaService';
import { descreverAcao, resultadoAcao } from '../../utils/auditoria';
import { formatDateTime } from '../../utils/formatters';
import styles from '../../styles/ListPage.module.css';

const RESULTADO_OPTIONS = [
  { value: '', label: 'Todos os resultados' },
  { value: 'true', label: 'Só falhas e bloqueios' },
];

/** Trilha de auditoria (ADMIN): quem alterou o quê, quando, de onde e com que resultado. */
export function AuditoriaPage() {
  const list = usePaginatedList(listAuditoria, { pageSize: 20, errorMessage: 'Não foi possível carregar a auditoria.' });
  const { items, pagination, loading, error } = list;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Auditoria"
        description="Registro de toda alteração de dados e tentativa de login. Não guarda o conteúdo enviado (senhas e dados pessoais ficam fora)."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Auditoria' }]}
      />

      <section className={styles.card}>
        <div className={styles.filters} role="search">
          <div className={styles.search}>
            <TextField
              label="Buscar por usuário"
              hideLabel
              icon={Search}
              type="search"
              placeholder="Nome ou e-mail de quem fez"
              value={list.buscaInput}
              onChange={(event) => list.setBuscaInput(event.target.value)}
              maxLength={100}
            />
          </div>
          <SelectField
            label="Resultado"
            hideLabel
            options={RESULTADO_OPTIONS}
            value={list.searchParams.get('falhas') ?? ''}
            onChange={(event) => list.updateParams({ falhas: event.target.value })}
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
                <th scope="col">Quando</th>
                <th scope="col">Quem</th>
                <th scope="col">Ação</th>
                <th scope="col">Resultado</th>
                <th scope="col" className={styles.optionalColumn}>
                  IP
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((registro) => {
                const resultado = resultadoAcao(registro.status);
                return (
                  <tr key={registro.id}>
                    <td data-label="Quando">{formatDateTime(registro.criadoEm)}</td>
                    <td data-label="Quem">
                      {registro.usuario ? (
                        <div className={styles.userText}>
                          <span className={styles.userName}>{registro.usuario.nome}</span>
                          <span className={styles.userEmail}>{registro.usuario.email}</span>
                        </div>
                      ) : (
                        <span className={styles.muted}>Não identificado</span>
                      )}
                    </td>
                    <td data-label="Ação">
                      <div className={styles.userText}>
                        <span>{descreverAcao(registro.metodo, registro.rota)}</span>
                        <span className={styles.userEmail}>
                          {registro.metodo} {registro.rota}
                        </span>
                      </div>
                    </td>
                    <td data-label="Resultado">
                      <Badge tone={resultado.tone}>
                        {resultado.label} ({registro.status})
                      </Badge>
                    </td>
                    <td data-label="IP" className={`${styles.muted} ${styles.optionalColumn}`}>
                      {registro.ip ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && !error && items.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Nenhum registro encontrado</p>
              <p className={styles.muted}>{list.hasFilters ? 'Tente outros filtros.' : 'As alterações aparecem aqui.'}</p>
            </div>
          )}

          {loading && items.length === 0 && (
            <p className={styles.loadingText}>
              <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando auditoria...
            </p>
          )}
        </div>

        {pagination && <Pagination {...pagination} disabled={loading} onPageChange={list.goToPage} />}
      </section>
    </div>
  );
}
