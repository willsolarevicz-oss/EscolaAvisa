import { UserMinus, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SearchPicker } from '../../components/SearchPicker';
import { listAlunos } from '../../services/alunoService';
import { getApiErrorMessage } from '../../services/api';
import { matricularAluno, removerAluno } from '../../services/turmaService';
import { getInitials } from '../../utils/formatters';
import formStyles from '../../styles/FormPage.module.css';
import styles from '../../styles/RelationSection.module.css';

// Só alunos ativos podem ser matriculados (o backend recusa os inativos).
const buscarAlunos = (busca, { signal }) =>
  listAlunos({ ativo: 'true', pageSize: 6, busca }, { signal }).then((data) => data.items);

export function TurmaAlunosSection({ turma, initialAlunos }) {
  const [matriculas, setMatriculas] = useState(initialAlunos);
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [transferPrompt, setTransferPrompt] = useState(null); // { aluno, message }
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [busy, setBusy] = useState(false);
  const alunoIds = new Set(matriculas.map((m) => m.aluno.id));

  async function matricular(aluno, transferir = false) {
    setBusy(true);
    try {
      const result = await matricularAluno(turma.id, aluno.id, { transferir });
      setMatriculas(result.alunos);
      setFeedback({
        type: 'success',
        message: result.transferidoDe
          ? `Matrícula de ${aluno.nome} transferida da turma ${result.transferidoDe.nome}.`
          : `Matrícula de ${aluno.nome} realizada.`,
      });
      setAdding(false);
      setTransferPrompt(null);
    } catch (error) {
      const errors = error.response?.data?.errors;
      // 409 com campo "transferir": o aluno está em outra turma do mesmo ano → pedir confirmação.
      if (error.response?.status === 409 && errors?.[0]?.field === 'transferir') {
        setTransferPrompt({ aluno, message: errors[0].message });
      } else {
        setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível matricular o aluno.') });
        setTransferPrompt(null);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    const { aluno } = confirmRemove;
    setBusy(true);
    try {
      await removerAluno(turma.id, aluno.id);
      setMatriculas((prev) => prev.filter((m) => m.aluno.id !== aluno.id));
      setFeedback({ type: 'success', message: `Matrícula de ${aluno.nome} encerrada. O histórico foi mantido.` });
    } catch (error) {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível encerrar a matrícula.') });
    } finally {
      setBusy(false);
      setConfirmRemove(null);
    }
  }

  return (
    <section className={formStyles.card} aria-labelledby="turma-alunos-title">
      <div className={formStyles.cardHeader}>
        <h3 id="turma-alunos-title" className={formStyles.cardTitle}>
          Alunos ({matriculas.length})
        </h3>
        {turma.ativo && !adding && (
          <Button size="sm" icon={UserPlus} onClick={() => { setAdding(true); setFeedback(null); }}>
            Matricular aluno
          </Button>
        )}
      </div>

      <div className={styles.body}>
        {!turma.ativo && <Alert type="info">Turma desativada: reative-a para matricular ou remover alunos.</Alert>}
        {feedback && (
          <Alert type={feedback.type} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        )}

        {adding && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h4 className={styles.panelTitle}>Matricular aluno em {turma.nome}</h4>
              <button type="button" className={styles.iconButton} onClick={() => setAdding(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <SearchPicker
              label="Buscar aluno"
              placeholder="Nome ou matrícula do aluno"
              fetchItems={buscarAlunos}
              getTitle={(aluno) => aluno.nome}
              getSubtitle={(aluno) => `Matrícula ${aluno.matricula}`}
              getDisabledReason={(aluno) => (alunoIds.has(aluno.id) ? 'Já na turma' : null)}
              onSelect={(aluno) => matricular(aluno)}
              selectLabel="Matricular"
              emptyMessage="Nenhum aluno ativo encontrado."
              disabled={busy}
            />
            <p className={styles.hint}>
              Não encontrou? Cadastre o aluno em <Link to="/alunos/novo">Alunos → Novo aluno</Link>.
            </p>
          </div>
        )}

        {matriculas.length === 0 && !adding && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nenhum aluno matriculado</p>
            <p className={formStyles.muted}>Os alunos matriculados aparecem aqui.</p>
          </div>
        )}

        {matriculas.length > 0 && (
          <ul className={styles.list}>
            {matriculas.map(({ id, aluno }) => (
              <li key={id} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.avatar} aria-hidden="true">
                    {getInitials(aluno.nome)}
                  </span>
                  <div className={styles.personText}>
                    <Link to={`/alunos/${aluno.id}/editar`}>
                      <strong>{aluno.nome}</strong>
                    </Link>
                    <span>Matrícula {aluno.matricula}</span>
                    <div className={styles.tags}>{!aluno.ativo && <Badge tone="danger">Aluno inativo</Badge>}</div>
                  </div>
                  {turma.ativo && (
                    <div className={styles.itemActions}>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={UserMinus}
                        onClick={() => setConfirmRemove({ aluno })}
                        disabled={busy}
                        aria-label={`Remover ${aluno.nome} da turma`}
                        title="Remover da turma"
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={transferPrompt !== null}
        title="Transferir aluno?"
        confirmLabel="Transferir para esta turma"
        loading={busy}
        onCancel={() => setTransferPrompt(null)}
        onConfirm={() => matricular(transferPrompt.aluno, true)}
      >
        <p>{transferPrompt?.message}</p>
        <p>A matrícula anterior será encerrada e ficará no histórico.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Remover aluno da turma?"
        confirmLabel="Remover"
        confirmVariant="danger"
        loading={busy}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={handleRemove}
      >
        <p>
          A matrícula de <strong>{confirmRemove?.aluno.nome}</strong> em {turma.nome} será encerrada. O cadastro do
          aluno e o histórico continuam no sistema.
        </p>
      </ConfirmDialog>
    </section>
  );
}
