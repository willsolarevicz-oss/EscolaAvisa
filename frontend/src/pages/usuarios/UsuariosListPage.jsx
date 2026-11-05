import axios from 'axios';
import { Pencil, RefreshCw, Search, UserCheck, UserPlus, UserX, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { SelectField } from '../../components/SelectField';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../hooks/useAuth';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../../services/api';
import { listUsuarios, setUsuarioAtivo } from '../../services/usuarioService';
import { formatDate, getInitials, ROLE_OPTIONS, roleLabel } from '../../utils/formatters';
import styles from './UsuariosListPage.module.css';

const PAGE_SIZE = 10;
const TIPO_OPTIONS = [{ value: '', label: 'Todos os perfis' }, ...ROLE_OPTIONS];
const ATIVO_OPTIONS = [
  { value: '', label: 'Todas as situações' },
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Inativos' },
];
const ROLE_TONES = { ADMIN: 'primary', PROFESSOR: 'warning', RESPONSAVEL: 'neutral' };

export function UsuariosListPage() {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Filtros e página ficam na URL: recarregar a página ou compartilhar o link mantém a busca.
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const tipo = searchParams.get('tipo') ?? '';
  const ativo = searchParams.get('ativo') ?? '';
  const hasFilters = Boolean(searchParams.get('busca') || tipo || ativo);

  const [buscaInput, setBuscaInput] = useState(() => searchParams.get('busca') ?? '');
  const debouncedBusca = useDebouncedValue(buscaInput.trim());

  // Mensagem vinda de outra página (ex.: "Usuário criado"). Lida uma vez e removida do histórico.
  const [flash, setFlash] = useState(() => location.state?.flash ?? null);
  useEffect(() => {
    if (location.state?.flash) navigate({ search: location.search }, { replace: true, state: null });
  }, [location.state, location.search, navigate]);

  const updateParams = useCallback(
    (changes) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(changes).forEach(([key, value]) => {
            if (value === '' || value === null || value === undefined) next.delete(key);
            else next.set(key, String(value));
          });
          // Mudou um filtro: volta para a primeira página.
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Aplica a busca só quando o usuário para de digitar.
  const lastAppliedBusca = useRef(debouncedBusca);
  useEffect(() => {
    if (debouncedBusca === lastAppliedBusca.current) return;
    lastAppliedBusca.current = debouncedBusca;
    updateParams({ busca: debouncedBusca });
  }, [debouncedBusca, updateParams]);

  // Carregamento: `loading` é derivado (resultado é de outra chave = ainda buscando).
  const [reloadToken, setReloadToken] = useState(0);
  const requestKey = `${queryString}#${reloadToken}`;
  const [result, setResult] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    const controller = new AbortController();
    const params = { pageSize: PAGE_SIZE, ...Object.fromEntries(new URLSearchParams(queryString)) };

    listUsuarios(params, { signal: controller.signal })
      .then((data) => setResult({ key: requestKey, data, error: null }))
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setResult((prev) => ({
          key: requestKey,
          data: prev.data,
          error: getApiErrorMessage(error, 'Não foi possível carregar os usuários.'),
        }));
      });

    // Cancela a requisição anterior se o filtro mudar antes da resposta chegar.
    return () => controller.abort();
  }, [queryString, requestKey]);

  const loading = result.key !== requestKey;
  const items = result.data?.items ?? [];
  const pagination = result.data?.pagination;

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  async function changeAtivo(usuario, novoAtivo) {
    setTogglingId(usuario.id);
    try {
      await setUsuarioAtivo(usuario.id, novoAtivo);
      setFlash({
        type: 'success',
        // Frase neutra: não sabemos o gênero da pessoa pelo nome.
        message: `Acesso de ${usuario.nome} ${novoAtivo ? 'reativado' : 'desativado'}.`,
      });
      setReloadToken((n) => n + 1);
    } catch (error) {
      setFlash({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível alterar a situação.') });
    } finally {
      setTogglingId(null);
      setConfirmTarget(null);
    }
  }

  function clearFilters() {
    setBuscaInput('');
    lastAppliedBusca.current = '';
    setSearchParams({}, { replace: true });
  }

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
              value={buscaInput}
              onChange={(event) => setBuscaInput(event.target.value)}
              maxLength={100}
            />
          </div>
          <SelectField
            label="Perfil"
            hideLabel
            options={TIPO_OPTIONS}
            value={tipo}
            onChange={(event) => updateParams({ tipo: event.target.value })}
          />
          <SelectField
            label="Situação"
            hideLabel
            options={ATIVO_OPTIONS}
            value={ativo}
            onChange={(event) => updateParams({ ativo: event.target.value })}
          />
          {hasFilters && (
            <Button variant="ghost" icon={X} onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>

        {result.error && (
          <div className={styles.feedback}>
            <Alert type="error">
              {result.error}{' '}
              <button type="button" className={styles.linkButton} onClick={() => setReloadToken((n) => n + 1)}>
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
                      <div className={styles.rowActions}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Pencil}
                          to={`/usuarios/${usuario.id}/editar`}
                          aria-label={`Editar ${usuario.nome}`}
                          title="Editar"
                        />
                        {usuario.ativo ? (
                          !isSelf && (
                            <Button
                              variant="danger"
                              size="sm"
                              icon={UserX}
                              onClick={() => setConfirmTarget(usuario)}
                              disabled={togglingId !== null}
                              aria-label={`Desativar ${usuario.nome}`}
                              title="Desativar"
                            />
                          )
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={UserCheck}
                            onClick={() => changeAtivo(usuario, true)}
                            loading={togglingId === usuario.id}
                            disabled={togglingId !== null}
                            aria-label={`Ativar ${usuario.nome}`}
                            title="Ativar"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!loading && !result.error && items.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Nenhum usuário encontrado</p>
              <p className={styles.muted}>
                {hasFilters ? 'Tente outros termos ou limpe os filtros.' : 'Cadastre o primeiro usuário.'}
              </p>
            </div>
          )}

          {loading && items.length === 0 && (
            <p className={styles.loadingText}>
              <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando usuários...
            </p>
          )}
        </div>

        {pagination && (
          <Pagination
            {...pagination}
            disabled={loading}
            onPageChange={(nextPage) => updateParams({ page: nextPage > 1 ? nextPage : '' })}
          />
        )}
      </section>

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Desativar usuário?"
        confirmLabel="Desativar"
        confirmVariant="danger"
        loading={togglingId !== null}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => changeAtivo(confirmTarget, false)}
      >
        <p>
          <strong>{confirmTarget?.nome}</strong> perderá o acesso ao sistema imediatamente, inclusive sessões já
          abertas. Você pode reativá-lo depois.
        </p>
      </ConfirmDialog>
    </div>
  );
}
