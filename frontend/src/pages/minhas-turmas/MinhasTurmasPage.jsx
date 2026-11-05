import { Megaphone, School, Users } from 'lucide-react';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { useRelatorio } from '../../hooks/useRelatorio';
import { listTurmasNotas } from '../../services/notaService';
import { turnoLabel } from '../../utils/formatters';
import listStyles from '../../styles/ListPage.module.css';
import notasStyles from '../../styles/Notas.module.css';
import styles from '../../styles/MinhasTurmas.module.css';

const carregarTurmas = (_params, options) => listTurmasNotas(options);
const SEM_PARAMS = {};

/** Professor: turmas ativas em que leciona, com atalhos para alunos, notas e avisos. */
export function MinhasTurmasPage() {
  const { data: turmas, error, loading } = useRelatorio(carregarTurmas, SEM_PARAMS, 'Não foi possível carregar suas turmas.');

  return (
    <div className={listStyles.page}>
      <PageHeader
        title="Minhas turmas"
        description="As turmas em que você leciona, com os alunos e atalhos para notas e avisos."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Minhas turmas' }]}
      />

      {error && <Alert type="error">{error}</Alert>}
      {loading && !turmas && <p className={listStyles.muted}>Carregando turmas...</p>}

      {turmas && turmas.length === 0 && (
        <div className={`${listStyles.card} ${listStyles.empty}`}>
          <School size={28} className={listStyles.emptyIcon} aria-hidden="true" />
          <p className={listStyles.emptyTitle}>Nenhuma turma ativa</p>
          <p className={listStyles.muted}>Peça à administração para atribuir suas turmas e disciplinas.</p>
        </div>
      )}

      {turmas && turmas.length > 0 && (
        <div className={notasStyles.turmas}>
          {turmas.map((turma) => (
            <article key={turma.id} className={notasStyles.turmaCard}>
              <h3>{turma.nome}</h3>
              <p>
                {turma.anoLetivo} · {turnoLabel(turma.turno)}
              </p>
              <span className={styles.label}>Lançar notas</span>
              <div className={notasStyles.disciplinas}>
                {turma.disciplinas.map((d) => (
                  <Button key={d.id} variant="secondary" size="sm" to={`/notas/turmas/${turma.id}/disciplinas/${d.id}`}>
                    {d.nome}
                  </Button>
                ))}
              </div>
              <div className={styles.cardActions}>
                <Button size="sm" icon={Users} to={`/minhas-turmas/${turma.id}`}>
                  Ver alunos
                </Button>
                <Button variant="secondary" size="sm" icon={Megaphone} to={`/avisos/novo?turmaId=${turma.id}`}>
                  Enviar aviso
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
