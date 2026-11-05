import { MessageSquare, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { Pagination } from '../../components/Pagination';
import { useAuth } from '../../hooks/useAuth';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { listConversas } from '../../services/conversaService';
import { formatDateTime } from '../../utils/formatters';
import { canalLabel, outroLado } from '../../utils/mensagens';
import listStyles from '../../styles/ListPage.module.css';
import comunicadoStyles from '../../styles/Comunicado.module.css';
import styles from '../../styles/Mensagens.module.css';

const FILTROS = [
  { value: '', label: 'Todas' },
  { value: 'true', label: 'Não lidas' },
];

const DESCRICAO_POR_PERFIL = {
  ADMIN: 'Conversas da secretaria com os responsáveis. Qualquer administrador pode responder.',
  PROFESSOR: 'Suas conversas com os responsáveis dos alunos das suas turmas.',
  RESPONSAVEL: 'Fale com a secretaria ou com os professores dos seus filhos.',
};

export function MensagensPage() {
  const { user } = useAuth();
  const list = usePaginatedList(listConversas, { errorMessage: 'Não foi possível carregar as conversas.' });
  const { items, pagination, loading, error } = list;
  const naoLidas = list.searchParams.get('naoLidas') ?? '';
  const isResponsavel = user.tipoUsuario === 'RESPONSAVEL';

  return (
    <div className={listStyles.page}>
      <PageHeader
        title="Mensagens"
        description={DESCRICAO_POR_PERFIL[user.tipoUsuario]}
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Mensagens' }]}
        actions={
          <Button icon={Plus} to="/mensagens/nova">
            Nova conversa
          </Button>
        }
      />

      <div className={comunicadoStyles.tabs} role="group" aria-label="Filtrar conversas">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`${comunicadoStyles.tab} ${naoLidas === f.value ? comunicadoStyles.tabActive : ''}`}
            aria-pressed={naoLidas === f.value}
            onClick={() => list.updateParams({ naoLidas: f.value })}
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
          <RefreshCw size={16} className="spin" aria-hidden="true" /> Carregando conversas...
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className={`${listStyles.card} ${listStyles.empty}`}>
          <MessageSquare size={28} className={listStyles.emptyIcon} aria-hidden="true" />
          <p className={listStyles.emptyTitle}>{naoLidas ? 'Nenhuma conversa com mensagem nova' : 'Nenhuma conversa ainda'}</p>
          <p className={listStyles.muted}>Use "Nova conversa" para começar.</p>
        </div>
      )}

      {items.length > 0 && (
        <ul className={`${comunicadoStyles.feed} ${loading ? listStyles.loading : ''}`} aria-busy={loading}>
          {items.map((conversa) => {
            const novas = conversa.naoLidas > 0;
            return (
              <li key={conversa.id}>
                <Link
                  to={`/mensagens/${conversa.id}`}
                  className={`${comunicadoStyles.feedItem} ${novas ? comunicadoStyles.unread : ''}`}
                >
                  <div className={comunicadoStyles.feedTop}>
                    <span className={comunicadoStyles.feedTitle}>{conversa.assunto}</span>
                    <span className={styles.feedSide}>
                      {formatDateTime(conversa.ultimaMensagemEm)}
                      {novas && (
                        <Badge tone="primary">
                          {conversa.naoLidas} {conversa.naoLidas === 1 ? 'nova' : 'novas'}
                        </Badge>
                      )}
                    </span>
                  </div>
                  <span className={comunicadoStyles.meta}>
                    <span>Com {outroLado(conversa, user.tipoUsuario)}</span>
                    <span>Aluno: {conversa.aluno.nome}</span>
                    {!isResponsavel && <span>{canalLabel(conversa.canal)}</span>}
                  </span>
                  {conversa.ultimaMensagem && (
                    <p className={comunicadoStyles.excerpt}>
                      {conversa.ultimaMensagem.autorNome}: {conversa.ultimaMensagem.conteudo}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
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
