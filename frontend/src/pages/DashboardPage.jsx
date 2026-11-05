import {
  ClipboardList,
  Construction,
  Database,
  GraduationCap,
  Megaphone,
  RefreshCw,
  School,
  Server,
} from 'lucide-react';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '../components/Badge';
import { useAuth } from '../hooks/useAuth';
import { useApiHealth } from '../hooks/useApiHealth';
import { listAlunos } from '../services/alunoService';
import { listAvisos, listMeusAvisos } from '../services/avisoService';
import { listTurmas } from '../services/turmaService';
import { formatDate, getFirstName, roleLabel } from '../utils/formatters';
import styles from './DashboardPage.module.css';

const anoAtual = new Date().getFullYear();

const avisosPublicados = {
  fetchTotal: (signal) => listAvisos({ ativo: 'true', pageSize: 1 }, { signal }),
  to: '/avisos',
  linkLabel: 'Ver avisos',
  hint: (total) => (total === 1 ? 'aviso publicado' : 'avisos publicados'),
};

// `live` (por perfil) mostra totais REAIS da API para quem tem acesso ao endpoint.
// Sem `live` para o perfil, o card mostra "—": nunca exibimos números inventados.
// pageSize=1 nas buscas: só precisamos do total que vem na paginação.
const MODULE_CARDS = [
  {
    label: 'Alunos',
    icon: GraduationCap,
    tone: 'blue',
    live: {
      ADMIN: {
        fetchTotal: (signal) => listAlunos({ ativo: 'true', pageSize: 1 }, { signal }),
        to: '/alunos',
        linkLabel: 'Ver alunos',
        hint: (total) => (total === 1 ? 'aluno ativo' : 'alunos ativos'),
      },
    },
  },
  {
    label: 'Turmas',
    icon: School,
    tone: 'green',
    live: {
      ADMIN: {
        fetchTotal: (signal) => listTurmas({ ativo: 'true', anoLetivo: anoAtual, pageSize: 1 }, { signal }),
        to: '/turmas',
        linkLabel: 'Ver turmas',
        hint: (total) => `${total === 1 ? 'turma ativa' : 'turmas ativas'} em ${anoAtual}`,
      },
    },
  },
  {
    label: 'Avisos',
    icon: Megaphone,
    tone: 'amber',
    live: {
      ADMIN: avisosPublicados,
      // Para o professor, a API já filtra só os avisos dele.
      PROFESSOR: { ...avisosPublicados, hint: (total) => (total === 1 ? 'aviso seu publicado' : 'avisos seus publicados') },
      RESPONSAVEL: {
        fetchTotal: (signal) => listMeusAvisos({ naoLidos: 'true', pageSize: 1 }, { signal }),
        to: '/meus-avisos',
        linkLabel: 'Ver avisos',
        hint: (total) => (total === 1 ? 'aviso não lido' : 'avisos não lidos'),
      },
    },
  },
  { label: 'Ocorrências', icon: ClipboardList, tone: 'red' },
];

const HEALTH_LABELS = {
  loading: { text: 'Verificando...', tone: 'neutral' },
  ok: { text: 'Operacional', tone: 'success' },
  degraded: { text: 'Indisponível', tone: 'danger' },
  offline: { text: 'Sem resposta', tone: 'danger' },
};

function SystemStatus() {
  const health = useApiHealth();
  const apiStatus = health.status === 'offline' ? HEALTH_LABELS.offline : health.status === 'loading' ? HEALTH_LABELS.loading : HEALTH_LABELS.ok;
  const dbStatus = HEALTH_LABELS[health.status];

  return (
    <section className={styles.panel} aria-labelledby="system-status-title">
      <div className={styles.panelHeader}>
        <h3 id="system-status-title" className={styles.panelTitle}>
          Status do sistema
        </h3>
        <button
          type="button"
          className={styles.iconButton}
          onClick={health.refresh}
          disabled={health.status === 'loading'}
          aria-label="Atualizar status"
        >
          <RefreshCw size={16} className={health.status === 'loading' ? 'spin' : undefined} />
        </button>
      </div>
      <ul className={styles.statusList}>
        <li>
          <span className={styles.statusLabel}>
            <Server size={16} aria-hidden="true" /> API
          </span>
          <Badge tone={apiStatus.tone}>{apiStatus.text}</Badge>
        </li>
        <li>
          <span className={styles.statusLabel}>
            <Database size={16} aria-hidden="true" /> Banco de dados
          </span>
          <Badge tone={dbStatus.tone}>{dbStatus.text}</Badge>
        </li>
      </ul>
      {health.data?.timestamp && (
        <p className={styles.panelFoot}>
          Última verificação: {formatDate(health.data.timestamp, { timeStyle: 'medium' })}
        </p>
      )}
    </section>
  );
}

function CardIcon({ icon: Icon, tone }) {
  return (
    <span className={`${styles.cardIcon} ${styles[`tone_${tone}`]}`} aria-hidden="true">
      <Icon size={20} />
    </span>
  );
}

/** Card com total real vindo da API. */
function CountCard({ label, icon, tone, live }) {
  const [state, setState] = useState({ status: 'loading', total: null });
  const { fetchTotal } = live;

  useEffect(() => {
    const controller = new AbortController();
    fetchTotal(controller.signal)
      .then((data) => setState({ status: 'ok', total: data.pagination.total }))
      .catch((error) => {
        if (!axios.isCancel(error)) setState({ status: 'error', total: null });
      });
    return () => controller.abort();
  }, [fetchTotal]);

  const hint = {
    loading: 'Carregando...',
    ok: live.hint(state.total),
    error: 'Não foi possível carregar',
  }[state.status];

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <CardIcon icon={icon} tone={tone} />
        <Link to={live.to} className={styles.cardLink}>
          {live.linkLabel}
        </Link>
      </div>
      <p className={styles.cardLabel}>{label}</p>
      <p className={`${styles.cardValue} ${state.status === 'ok' ? styles.cardValueReal : ''}`}>
        {state.status === 'ok' ? state.total : '—'}
      </p>
      <p className={styles.cardHint}>{hint}</p>
    </article>
  );
}

/** Card sem dado: módulo ainda não implementado ("Em breve") ou só da administração ("Restrito"). */
function PlaceholderCard({ label, icon, tone, restricted }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <CardIcon icon={icon} tone={tone} />
        <span className={styles.soon}>{restricted ? 'Restrito' : 'Em breve'}</span>
      </div>
      <p className={styles.cardLabel}>{label}</p>
      <p
        className={styles.cardValue}
        aria-label={`${label}: ${restricted ? 'disponível apenas para a administração' : 'sem dados ainda'}`}
      >
        —
      </p>
      <p className={styles.cardHint}>{restricted ? 'Disponível para a administração' : 'Módulo ainda não implementado'}</p>
    </article>
  );
}

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className={styles.page}>
      <section className={styles.welcome}>
        <div>
          <h2 className={styles.welcomeTitle}>Olá, {getFirstName(user.nome)}!</h2>
          <p className={styles.welcomeText}>
            {formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Badge tone="primary">{roleLabel(user.tipoUsuario)}</Badge>
      </section>

      <div className={styles.notice} role="note">
        <Construction size={18} aria-hidden="true" />
        <p>
          <strong>Em construção.</strong> Os indicadores marcados como “Em breve” serão preenchidos com dados reais
          quando cada módulo for implementado.
        </p>
      </div>

      <section className={styles.cards} aria-label="Indicadores dos módulos">
        {MODULE_CARDS.map((card) => {
          const live = card.live?.[user.tipoUsuario];
          return live ? (
            <CountCard key={card.label} label={card.label} icon={card.icon} tone={card.tone} live={live} />
          ) : (
            // Módulo existente mas restrito a outros perfis não é "não implementado".
            <PlaceholderCard key={card.label} {...card} restricted={Boolean(card.live)} />
          );
        })}
      </section>

      <div className={styles.panels}>
        <section className={styles.panel} aria-labelledby="profile-title">
          <div className={styles.panelHeader}>
            <h3 id="profile-title" className={styles.panelTitle}>
              Seu perfil
            </h3>
          </div>
          <dl className={styles.profile}>
            <div>
              <dt>Nome</dt>
              <dd>{user.nome}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Perfil</dt>
              <dd>{roleLabel(user.tipoUsuario)}</dd>
            </div>
            <div>
              <dt>Situação</dt>
              <dd>
                <Badge tone={user.ativo ? 'success' : 'danger'}>{user.ativo ? 'Ativo' : 'Inativo'}</Badge>
              </dd>
            </div>
            <div>
              <dt>Conta criada em</dt>
              <dd>{formatDate(user.criadoEm)}</dd>
            </div>
          </dl>
        </section>

        <SystemStatus />
      </div>
    </div>
  );
}
