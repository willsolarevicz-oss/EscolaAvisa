import { ArrowLeft, RotateCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { useEntityLoader } from '../../hooks/useEntityLoader';
import { getApiErrorMessage } from '../../services/api';
import { getGrade, lancarNotas } from '../../services/notaService';
import { turnoLabel } from '../../utils/formatters';
import { BIMESTRES, calcularMedia, formatNota, mediaTone, parseNota } from '../../utils/notas';
import formStyles from '../../styles/FormPage.module.css';
import styles from '../../styles/Notas.module.css';

const cellKey = (alunoId, bimestre) => `${alunoId}:${bimestre}`;
// Valor salvo → texto do campo ("7.5" → "7,5"; null → "").
const toInputText = (valor) => (valor === null ? '' : formatNota(valor));
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/** Grade de lançamento: alunos × bimestres de uma turma + disciplina. */
export function GradeNotasPage() {
  const { turmaId, disciplinaId } = useParams();
  const loader = useEntityLoader((_, opts) => getGrade({ turmaId, disciplinaId }, opts), `${turmaId}:${disciplinaId}`, {
    errorMessage: 'Não foi possível carregar a grade de notas.',
  });
  const grade = loader.data;

  // Só as células que o usuário mexeu: { "alunoId:bimestre": "texto digitado" }.
  const [edits, setEdits] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  // Compara o que foi digitado com o valor salvo para saber o que mudou e o que é inválido.
  const changes = [];
  const invalidKeys = new Set();
  if (grade) {
    for (const { aluno, notas } of grade.alunos) {
      for (const b of BIMESTRES) {
        const key = cellKey(aluno.id, b);
        if (!(key in edits)) continue;
        const valor = parseNota(edits[key]);
        if (Number.isNaN(valor)) invalidKeys.add(key);
        else if (valor !== notas[b]) changes.push({ alunoId: aluno.id, bimestre: b, valor });
      }
    }
  }
  const isDirty = changes.length > 0 || invalidKeys.size > 0;

  // Avisa antes de fechar/recarregar a aba com notas não salvas.
  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Notas', to: '/notas' },
    { label: grade ? `${grade.turma.nome} — ${grade.disciplina.nome}` : 'Grade' },
  ];

  async function handleSave() {
    if (invalidKeys.size > 0) {
      setFeedback({ type: 'error', message: 'Corrija as notas destacadas em vermelho (0 a 10, no máximo uma casa decimal).' });
      return;
    }
    if (changes.length === 0) return;

    setSaving(true);
    setFeedback(null);
    try {
      const { grade: atualizada, message } = await lancarNotas({ turmaId, disciplinaId }, changes);
      loader.setData(atualizada);
      setEdits({});
      setFeedback({ type: 'success', message });
    } catch (error) {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível salvar as notas.') });
    } finally {
      setSaving(false);
    }
  }

  if (loader.status !== 'ready') {
    return (
      <div className={formStyles.page}>
        <PageHeader title="Notas" breadcrumbs={breadcrumbs} />
        {loader.status === 'loading' ? (
          <p className={formStyles.muted}>Carregando grade...</p>
        ) : (
          <>
            <Alert type="error">
              {loader.status === 'notfound' ? 'Turma ou disciplina não encontrada.' : loader.errorMessage}
            </Alert>
            <div className={formStyles.formActions}>
              <Button to="/notas" icon={ArrowLeft}>
                Voltar para notas
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  const editable = grade.turma.ativo;

  return (
    <div className={formStyles.page}>
      <PageHeader
        title={`${grade.disciplina.nome} — ${grade.turma.nome}`}
        description={`${grade.turma.anoLetivo} · ${turnoLabel(grade.turma.turno)} · notas de 0 a 10, média simples dos bimestres lançados`}
        breadcrumbs={breadcrumbs}
      />

      {!editable && <Alert type="warning">Turma desativada: as notas estão somente para consulta.</Alert>}
      {feedback && (
        <Alert type={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      )}

      <section className={formStyles.card} aria-label="Grade de notas">
        {grade.alunos.length === 0 ? (
          <div className={styles.toolbar}>
            <p className={formStyles.muted}>Nenhum aluno com matrícula ativa nesta turma.</p>
          </div>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Aluno</th>
                  {BIMESTRES.map((b) => (
                    <th key={b} scope="col">
                      {b}º bim.
                    </th>
                  ))}
                  <th scope="col">Média</th>
                </tr>
              </thead>
              <tbody>
                {grade.alunos.map(({ aluno, notas }) => {
                  // Média ao vivo: usa o que está digitado (se válido) ou o valor salvo.
                  const atuais = Object.fromEntries(
                    BIMESTRES.map((b) => {
                      const key = cellKey(aluno.id, b);
                      return [b, key in edits ? parseNota(edits[key]) : notas[b]];
                    }),
                  );
                  const media = calcularMedia(atuais);
                  return (
                    <tr key={aluno.id}>
                      <th scope="row">
                        <span className={styles.name}>
                          {aluno.nome}
                          <span>{aluno.matricula}</span>
                        </span>
                      </th>
                      {BIMESTRES.map((b) => {
                        const key = cellKey(aluno.id, b);
                        if (!editable) {
                          return (
                            <td key={b} className={styles.value}>
                              {formatNota(notas[b])}
                            </td>
                          );
                        }
                        const invalid = invalidKeys.has(key);
                        const dirty = !invalid && changes.some((c) => c.alunoId === aluno.id && c.bimestre === b);
                        return (
                          <td key={b}>
                            <input
                              className={`${styles.cell} ${dirty ? styles.dirty : ''} ${invalid ? styles.invalid : ''}`}
                              inputMode="decimal"
                              autoComplete="off"
                              maxLength={4}
                              aria-label={`Nota do ${b}º bimestre de ${aluno.nome}`}
                              aria-invalid={invalid}
                              value={key in edits ? edits[key] : toInputText(notas[b])}
                              onChange={(event) => setEdits((prev) => ({ ...prev, [key]: event.target.value }))}
                              disabled={saving}
                            />
                          </td>
                        );
                      })}
                      <td>
                        <Badge tone={mediaTone(media)}>{formatNota(media)}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editable && grade.alunos.length > 0 && (
          <div className={styles.toolbar}>
            <span className={`${styles.status} ${isDirty ? styles.statusDirty : ''}`} role="status">
              {invalidKeys.size > 0
                ? plural(invalidKeys.size, 'nota inválida', 'notas inválidas')
                : changes.length > 0
                  ? plural(changes.length, 'alteração não salva', 'alterações não salvas')
                  : 'Tudo salvo. Apague o valor de uma célula para remover a nota.'}
            </span>
            <div className={styles.actions}>
              <Button variant="secondary" icon={RotateCcw} onClick={() => setEdits({})} disabled={!isDirty || saving}>
                Descartar
              </Button>
              <Button icon={Save} onClick={handleSave} loading={saving} loadingText="Salvando..." disabled={!isDirty}>
                Salvar notas
              </Button>
            </div>
          </div>
        )}
      </section>

      <div>
        <Button variant="secondary" to="/notas" icon={ArrowLeft}>
          Voltar para turmas
        </Button>
      </div>
    </div>
  );
}
