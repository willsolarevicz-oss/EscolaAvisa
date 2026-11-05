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
import { formatDate, getFirstName, roleLabel } from '../utils/formatters';
import styles from './DashboardPage.module.css';

// Módulos sem endpoint mostram "—" em vez de números inventados. Alunos é real (ver AlunosCard).
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

/** Card com o total REAL de alunos ativos (só para ADMIN, que é quem acessa /api/alunos). */
function AlunosCard({ icon: Icon, tone }) {
  const [state, setState] = useState({ status: 'loading', total: null });

  useEffect(() => {
    const controller = new AbortController();
    // pageSize=1: só precisamos do total que vem na paginação.
    listAlunos({ ativo: 'true', pageSize: 1 }, { signal: controller.signal })
      .then((data) => setState({ status: 'ok', total: data.pagination.total }))
      .catch((error) => {
        if (!axios.isCancel(error)) setState({ status: 'error', total: null });
      });
    return () => controller.abort();
  }, []);

  const hint = {
    loading: 'Carregando...',
    ok: state.total === 1 ? 'aluno ativo' : 'alunos ativos',
    error: 'Não foi possível carregar',
  }[state.status];

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <span className={`${styles.cardIcon} ${styles[`tone_${tone}`]}`} aria-hidden="true">
          <Icon size={20} />
        </span>
        <Link to="/alunos" className={styles.cardLink}>
          Ver alunos
        </Link>
      </div>
      <p className={styles.cardLabel}>Alunos</p>
      <p className={`${styles.cardValue} ${state.status === 'ok' ? styles.cardValueReal : ''}`}>
        {state.status === 'ok' ? state.total : '—'}
      </p>
      <p className={styles.cardHint}>{hint}</p>
    </article>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user.tipoUsuario === 'ADMIN';

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
        {MODULE_CARDS.map(({ label, icon: Icon, tone }) =>
          label === 'Alunos' && isAdmin ? (
            <AlunosCard key={label} icon={Icon} tone={tone} />
          ) : label === 'Alunos' ? (
            // O módulo existe, mas só a administração acessa: não é "não implementado".
            <article key={label} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={`${styles.cardIcon} ${styles[`tone_${tone}`]}`} aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className={styles.soon}>Restrito</span>
              </div>
              <p className={styles.cardLabel}>{label}</p>
              <p className={styles.cardValue} aria-label={`${label}: disponível apenas para a administração`}>
                —
              </p>
              <p className={styles.cardHint}>Disponível para a administração</p>
            </article>
          ) : (
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
          ),
        )}
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
