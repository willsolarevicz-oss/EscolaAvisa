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
import { useAuth } from '../hooks/useAuth';
import { useApiHealth } from '../hooks/useApiHealth';
import { formatDate, getFirstName, roleLabel } from '../utils/formatters';
import styles from './DashboardPage.module.css';

// Os módulos ainda não têm endpoints: mostramos "—" em vez de números inventados.
const MODULE_CARDS = [
  { label: 'Alunos', icon: GraduationCap, tone: 'blue' },
  { label: 'Turmas', icon: School, tone: 'green' },
  { label: 'Avisos', icon: Megaphone, tone: 'amber' },
  { label: 'Ocorrências', icon: ClipboardList, tone: 'red' },
];

const HEALTH_LABELS = {
  loading: { text: 'Verificando...', tone: 'neutral' },
  ok: { text: 'Operacional', tone: 'success' },
  degraded: { text: 'Indisponível', tone: 'danger' },
  offline: { text: 'Sem resposta', tone: 'danger' },
};

function StatusBadge({ tone, children }) {
  return <span className={`${styles.badge} ${styles[`badge_${tone}`]}`}>{children}</span>;
}

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
          <StatusBadge tone={apiStatus.tone}>{apiStatus.text}</StatusBadge>
        </li>
        <li>
          <span className={styles.statusLabel}>
            <Database size={16} aria-hidden="true" /> Banco de dados
          </span>
          <StatusBadge tone={dbStatus.tone}>{dbStatus.text}</StatusBadge>
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
        <StatusBadge tone="primary">{roleLabel(user.tipoUsuario)}</StatusBadge>
      </section>

      <div className={styles.notice} role="note">
        <Construction size={18} aria-hidden="true" />
        <p>
          <strong>Estrutura inicial.</strong> Os indicadores abaixo serão preenchidos com dados reais quando cada
          módulo for implementado.
        </p>
      </div>

      <section className={styles.cards} aria-label="Indicadores dos módulos">
        {MODULE_CARDS.map(({ label, icon: Icon, tone }) => (
          <article key={label} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={`${styles.cardIcon} ${styles[`tone_${tone}`]}`} aria-hidden="true">
                <Icon size={20} />
              </span>
              <span className={styles.soon}>Em breve</span>
            </div>
            <p className={styles.cardLabel}>{label}</p>
            <p className={styles.cardValue} aria-label={`${label}: sem dados ainda`}>
              —
            </p>
            <p className={styles.cardHint}>Módulo ainda não implementado</p>
          </article>
        ))}
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
                <StatusBadge tone={user.ativo ? 'success' : 'danger'}>{user.ativo ? 'Ativo' : 'Inativo'}</StatusBadge>
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
