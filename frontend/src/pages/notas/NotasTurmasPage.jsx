import axios from 'axios';
import { NotebookPen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../hooks/useAuth';
import { getApiErrorMessage } from '../../services/api';
import { listTurmasNotas } from '../../services/notaService';
import { turnoLabel } from '../../utils/formatters';
import listStyles from '../../styles/ListPage.module.css';
import styles from '../../styles/Notas.module.css';

/** Escolha da turma + disciplina para lançar notas. */
export function NotasTurmasPage() {
  const { user } = useAuth();
  const isProfessor = user.tipoUsuario === 'PROFESSOR';
  const [state, setState] = useState({ status: 'loading', turmas: [], error: '' });

  useEffect(() => {
    const controller = new AbortController();
    listTurmasNotas({ signal: controller.signal })
      .then((turmas) => setState({ status: 'ready', turmas, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setState({ status: 'error', turmas: [], error: getApiErrorMessage(error, 'Não foi possível carregar as turmas.') });
      });
    return () => controller.abort();
  }, []);

  return (
    <div className={listStyles.page}>
      <PageHeader
        title="Notas"
        description={
          isProfessor
            ? 'Escolha a turma e a disciplina para lançar as notas dos bimestres.'
            : 'Escolha a turma e a disciplina para consultar ou corrigir notas.'
        }
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Notas' }]}
      />

      {state.status === 'loading' && <p className={listStyles.muted}>Carregando turmas...</p>}
      {state.status === 'error' && <Alert type="error">{state.error}</Alert>}

      {state.status === 'ready' && state.turmas.length === 0 && (
        <div className={`${listStyles.card} ${listStyles.empty}`}>
          <NotebookPen size={28} className={listStyles.emptyIcon} aria-hidden="true" />
          <p className={listStyles.emptyTitle}>Nenhuma turma para lançamento</p>
          <p className={listStyles.muted}>
            {isProfessor
              ? 'Você ainda não leciona em nenhuma turma ativa. Peça à administração para atribuir suas turmas.'
              : 'Atribua professores às disciplinas das turmas (em Turmas) para que as grades de notas apareçam aqui.'}
          </p>
        </div>
      )}

      {state.turmas.length > 0 && (
        <div className={styles.turmas}>
          {state.turmas.map((turma) => (
            <article key={turma.id} className={styles.turmaCard}>
              <h3>{turma.nome}</h3>
              <p>
                {turma.anoLetivo} · {turnoLabel(turma.turno)}
              </p>
              <div className={styles.disciplinas}>
                {turma.disciplinas.map((d) => (
                  <Button key={d.id} variant="secondary" size="sm" to={`/notas/turmas/${turma.id}/disciplinas/${d.id}`}>
                    {d.nome}
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
