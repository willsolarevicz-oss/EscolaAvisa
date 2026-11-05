import { RefreshCw, Search, UserPlus, X } from 'lucide-react';
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
import { useAuth } from '../../hooks/useAuth';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { listUsuarios, setUsuarioAtivo } from '../../services/usuarioService';
import { ATIVO_FILTER_OPTIONS, formatDate, getInitials, ROLE_OPTIONS, roleLabel } from '../../utils/formatters';
import styles from '../../styles/ListPage.module.css';

const TIPO_OPTIONS = [{ value: '', label: 'Todos os perfis' }, ...ROLE_OPTIONS];
const ROLE_TONES = { ADMIN: 'primary', PROFESSOR: 'warning', RESPONSAVEL: 'neutral' };

export function UsuariosListPage() {
  const { user: currentUser } = useAuth();
  const [flash, setFlash] = useFlashMessage();
  const list = usePaginatedList(listUsuarios, { errorMessage: 'Não foi possível carregar os usuários.' });
  const { items, pagination, loading, error } = list;

  const toggle = useAtivoToggle({
    setAtivo: setUsuarioAtivo,
    // Frase neutra: não sabemos o gênero da pessoa pelo nome.
    successMessage: (usuario, novoAtivo) => `Acesso de ${usuario.nome} ${novoAtivo ? 'reativado' : 'desativado'}.`,
    onDone: (message) => {
      setFlash(message);
      if (message.type === 'success') list.reload();
    },
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Usuários"
        description="Gerencie o acesso de administradores, professores e responsáveis."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Usuários' }]}
        actions={
          <Button to="/usuarios/novo" icon={UserPlus}>
            Novo usuário
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
              label="Buscar usuários"
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
            label="Perfil"
            hideLabel
            options={TIPO_OPTIONS}
            value={list.searchParams.get('tipo') ?? ''}
            onChange={(event) => list.updateParams({ tipo: event.target.value })}
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
                <th scope="col">Usuário</th>
                <th scope="col">Perfil</th>
                <th scope="col">Situação</th>
                <th scope="col" className={styles.optionalColumn}>
                  Criado em
                </th>
                <th scope="col">
                  <span className="visually-hidden">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((usuario) => {
                const isSelf = usuario.id === currentUser.id;
                return (
                  <tr key={usuario.id}>
                    <td data-label="Usuário">
                      <div className={styles.userCell}>
                        <span className={styles.avatar} aria-hidden="true">
                          {getInitials(usuario.nome)}
                        </span>
                        <div className={styles.userText}>
                          <span className={styles.userName}>
                            {usuario.nome}
                            {isSelf && <span className={styles.selfTag}>Você</span>}
                          </span>
                          <span className={styles.userEmail}>{usuario.email}</span>
                        </div>
                      </div>
                    </td>
                    <td data-label="Perfil">
                      <Badge tone={ROLE_TONES[usuario.tipoUsuario]}>{roleLabel(usuario.tipoUsuario)}</Badge>
                    </td>
                    <td data-label="Situação">
                      <Badge tone={usuario.ativo ? 'success' : 'danger'}>{usuario.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td data-label="Criado em" className={`${styles.muted} ${styles.optionalColumn}`}>
                      {formatDate(usuario.criadoEm, { dateStyle: 'medium' })}
                    </td>
                    <td className={styles.actionsCell}>
                      <RowActions
                        item={usuario}
                        label={usuario.nome}
                        editTo={`/usuarios/${usuario.id}/editar`}
                        toggle={toggle}
                        canDeactivate={!isSelf}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && !error && items.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Nenhum usuário encontrado</p>
              <p className={styles.muted}>
                {list.hasFilters ? 'Tente outros termos ou limpe os filtros.' : 'Cadastre o primeiro usuário.'}
              </p>
            </div>
          )}

          {loading && items.length === 0 && (
            <p className={styles.loadingText}>
              <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando usuários...
            </p>
          )}
        </div>

        {pagination && <Pagination {...pagination} disabled={loading} onPageChange={list.goToPage} />}
      </section>

      <ConfirmDialog
        open={toggle.confirmTarget !== null}
        title="Desativar usuário?"
        confirmLabel="Desativar"
        confirmVariant="danger"
        loading={toggle.busy}
        onCancel={toggle.cancelDeactivate}
        onConfirm={toggle.confirmDeactivate}
      >
        <p>
          <strong>{toggle.confirmTarget?.nome}</strong> perderá o acesso ao sistema imediatamente, inclusive sessões já
          abertas. Você pode reativar o acesso depois.
        </p>
      </ConfirmDialog>
    </div>
  );
}
