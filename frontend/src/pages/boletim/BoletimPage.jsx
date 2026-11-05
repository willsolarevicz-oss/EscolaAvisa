import axios from 'axios';
import { NotebookPen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { PageHeader } from '../../components/PageHeader';
import { getApiErrorMessage } from '../../services/api';
import { getBoletim } from '../../services/notaService';
import { BIMESTRES, formatNota, mediaTone } from '../../utils/notas';
import formStyles from '../../styles/FormPage.module.css';
import listStyles from '../../styles/ListPage.module.css';
import styles from '../../styles/Notas.module.css';

/** Boletim (notas por bimestre e média) de cada aluno do responsável logado. */
export function BoletimPage() {
  const [state, setState] = useState({ status: 'loading', boletins: [], error: '' });

  useEffect(() => {
    const controller = new AbortController();
    getBoletim({ signal: controller.signal })
      .then((boletins) => setState({ status: 'ready', boletins, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setState({ status: 'error', boletins: [], error: getApiErrorMessage(error, 'Não foi possível carregar o boletim.') });
      });
    return () => controller.abort();
  }, []);

  return (
    <div className={formStyles.page}>
      <PageHeader
        title="Boletim"
        description="Notas de 0 a 10 por bimestre. A média é a média simples dos bimestres já lançados."
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Boletim' }]}
      />

      {state.status === 'loading' && <p className={formStyles.muted}>Carregando boletim...</p>}
      {state.status === 'error' && <Alert type="error">{state.error}</Alert>}

      {state.status === 'ready' && state.boletins.length === 0 && (
        <div className={`${listStyles.card} ${listStyles.empty}`}>
          <NotebookPen size={28} className={listStyles.emptyIcon} aria-hidden="true" />
          <p className={listStyles.emptyTitle}>Nenhum boletim disponível</p>
          <p className={listStyles.muted}>
            O boletim aparece quando um aluno vinculado a você estiver matriculado em uma turma.
          </p>
        </div>
      )}

      {state.boletins.map(({ aluno, turma, disciplinas }) => (
        <section key={`${aluno.id}:${turma.id}`} className={formStyles.card} aria-label={`Boletim de ${aluno.nome}`}>
          <div className={formStyles.cardHeader}>
            <h3 className={formStyles.cardTitle}>{aluno.nome}</h3>
            <span className={formStyles.muted}>
              {turma.nome} · {turma.anoLetivo}
            </span>
          </div>
          {disciplinas.length === 0 ? (
            <div className={styles.toolbar}>
              <p className={formStyles.muted}>A turma ainda não tem disciplinas com notas.</p>
            </div>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Disciplina</th>
                    {BIMESTRES.map((b) => (
                      <th key={b} scope="col">
                        {b}º bim.
                      </th>
                    ))}
                    <th scope="col">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {disciplinas.map(({ disciplina, notas, media }) => (
                    <tr key={disciplina.id}>
                      <th scope="row">{disciplina.nome}</th>
                      {BIMESTRES.map((b) => (
                        <td key={b} className={styles.value}>
                          {formatNota(notas[b])}
                        </td>
                      ))}
                      <td>
                        <Badge tone={mediaTone(media)}>{formatNota(media)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
