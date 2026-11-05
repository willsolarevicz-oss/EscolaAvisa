import axios from 'axios';
import { Trash2, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SearchPicker } from '../../components/SearchPicker';
import { SelectField } from '../../components/SelectField';
import { getApiErrorMessage } from '../../services/api';
import { listDisciplinas } from '../../services/disciplinaService';
import { atribuirProfessor, listProfessores, removerAtribuicao } from '../../services/turmaService';
import { listUsuarios } from '../../services/usuarioService';
import { toFieldErrors } from '../../utils/apiErrors';
import { getInitials } from '../../utils/formatters';
import formStyles from '../../styles/FormPage.module.css';
import styles from '../../styles/RelationSection.module.css';

const buscarProfessores = (busca, { signal }) =>
  listUsuarios({ tipo: 'PROFESSOR', ativo: 'true', pageSize: 6, busca }, { signal }).then((data) => data.items);

/** Painel "Atribuir professor": escolhe disciplina (select) e professor (busca). */
function AtribuirPanel({ turma, onCancel, onSaved }) {
  const [disciplinas, setDisciplinas] = useState({ status: 'loading', items: [] });
  const [disciplinaId, setDisciplinaId] = useState('');
  const [professor, setProfessor] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  // Só disciplinas ativas podem receber novas atribuições.
  useEffect(() => {
    const controller = new AbortController();
    listDisciplinas({ ativo: 'true', pageSize: 100 }, { signal: controller.signal })
      .then((data) => setDisciplinas({ status: 'ready', items: data.items }))
      .catch((error) => {
        if (!axios.isCancel(error)) setDisciplinas({ status: 'error', items: [] });
      });
    return () => controller.abort();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = {};
    if (!disciplinaId) validation.disciplinaId = 'Selecione a disciplina.';
    if (!professor) validation.professorId = 'Selecione o professor.';
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    setSubmitError('');
    try {
      const atribuicao = await atribuirProfessor(turma.id, { professorId: professor.id, disciplinaId });
      onSaved(`Atribuição criada: ${atribuicao.professor.nome} — ${atribuicao.disciplina.nome}.`);
    } catch (error) {
      setErrors(toFieldErrors(error));
      setSubmitError(getApiErrorMessage(error, 'Não foi possível atribuir o professor.'));
      setSaving(false);
    }
  }

  const disciplinaOptions = [
    { value: '', label: disciplinas.status === 'loading' ? 'Carregando...' : 'Selecione a disciplina' },
    ...disciplinas.items.map((d) => ({ value: d.id, label: d.nome })),
  ];

  return (
    <form className={styles.panel} onSubmit={handleSubmit} noValidate aria-label="Atribuir professor">
      <div className={styles.panelHeader}>
        <h4 className={styles.panelTitle}>Atribuir professor em {turma.nome}</h4>
        <button type="button" className={styles.iconButton} onClick={onCancel} aria-label="Fechar">
          <X size={18} />
        </button>
      </div>

      {submitError && <Alert type="error">{submitError}</Alert>}
      {disciplinas.status === 'error' && <Alert type="error">Não foi possível carregar as disciplinas.</Alert>}
      {disciplinas.status === 'ready' && disciplinas.items.length === 0 && (
        <Alert type="warning">
          Nenhuma disciplina ativa. <Link to="/disciplinas/nova">Cadastre uma disciplina</Link> primeiro.
        </Alert>
      )}

      <div className={styles.fields}>
        <SelectField
          label="Disciplina"
          name="disciplinaId"
          options={disciplinaOptions}
          value={disciplinaId}
          onChange={(event) => {
            setDisciplinaId(event.target.value);
            setErrors((prev) => ({ ...prev, disciplinaId: undefined }));
          }}
          error={errors.disciplinaId}
          disabled={saving || disciplinas.status !== 'ready'}
        />
      </div>

      {professor ? (
        <div className={styles.selected}>
          <span className={styles.avatar} aria-hidden="true">
            {getInitials(professor.nome)}
          </span>
          <div className={styles.personText}>
            <strong>{professor.nome}</strong>
            <span>{professor.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setProfessor(null)} disabled={saving}>
            Trocar
          </Button>
        </div>
      ) : (
        <SearchPicker
          label="Professor"
          placeholder="Nome ou e-mail do professor"
          fetchItems={buscarProfessores}
          getTitle={(usuario) => usuario.nome}
          getSubtitle={(usuario) => usuario.email}
          onSelect={(usuario) => {
            setProfessor(usuario);
            setErrors((prev) => ({ ...prev, professorId: undefined }));
          }}
          emptyMessage="Nenhum professor ativo encontrado."
        />
      )}
      {errors.professorId && <p className={styles.fieldError}>{errors.professorId}</p>}

      <div className={formStyles.formActions}>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving} loadingText="Atribuindo...">
          Atribuir
        </Button>
      </div>
    </form>
  );
}

export function TurmaProfessoresSection({ turma, initialProfessores }) {
  const [atribuicoes, setAtribuicoes] = useState(initialProfessores);
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  async function refresh(successMessage) {
    setAdding(false);
    try {
      setAtribuicoes(await listProfessores(turma.id));
      setFeedback({ type: 'success', message: successMessage });
    } catch (error) {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível atualizar a lista.') });
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await removerAtribuicao(turma.id, confirmRemove.id);
      setAtribuicoes((prev) => prev.filter((a) => a.id !== confirmRemove.id));
      setFeedback({
        type: 'success',
        message: `Atribuição removida: ${confirmRemove.professor.nome} — ${confirmRemove.disciplina.nome}.`,
      });
    } catch (error) {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível remover a atribuição.') });
    } finally {
      setRemoving(false);
      setConfirmRemove(null);
    }
  }

  return (
    <section className={formStyles.card} aria-labelledby="turma-professores-title">
      <div className={formStyles.cardHeader}>
        <h3 id="turma-professores-title" className={formStyles.cardTitle}>
          Professores e disciplinas
        </h3>
        {turma.ativo && !adding && (
          <Button size="sm" icon={UserPlus} onClick={() => { setAdding(true); setFeedback(null); }}>
            Atribuir professor
          </Button>
        )}
      </div>

      <div className={styles.body}>
        {feedback && (
          <Alert type={feedback.type} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        )}

        {adding && <AtribuirPanel turma={turma} onCancel={() => setAdding(false)} onSaved={refresh} />}

        {atribuicoes.length === 0 && !adding && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nenhum professor atribuído</p>
            <p className={formStyles.muted}>Atribua um professor para cada disciplina lecionada nesta turma.</p>
          </div>
        )}

        {atribuicoes.length > 0 && (
          <ul className={styles.list}>
            {atribuicoes.map((atribuicao) => (
              <li key={atribuicao.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.avatar} aria-hidden="true">
                    {getInitials(atribuicao.professor.nome)}
                  </span>
                  <div className={styles.personText}>
                    <strong>{atribuicao.disciplina.nome}</strong>
                    <span>
                      {atribuicao.professor.nome} · {atribuicao.professor.email}
                    </span>
                    <div className={styles.tags}>
                      {!atribuicao.professor.ativo && <Badge tone="danger">Professor inativo</Badge>}
                      {!atribuicao.disciplina.ativo && <Badge tone="warning">Disciplina inativa</Badge>}
                    </div>
                  </div>
                  {turma.ativo && (
                    <div className={styles.itemActions}>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        onClick={() => setConfirmRemove(atribuicao)}
                        aria-label={`Remover ${atribuicao.professor.nome} de ${atribuicao.disciplina.nome}`}
                        title="Remover atribuição"
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
        open={confirmRemove !== null}
        title="Remover atribuição?"
        confirmLabel="Remover"
        confirmVariant="danger"
        loading={removing}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={handleRemove}
      >
        <p>
          <strong>{confirmRemove?.professor.nome}</strong> deixará de lecionar {confirmRemove?.disciplina.nome} em{' '}
          {turma.nome}. O cadastro do professor não é alterado.
        </p>
      </ConfirmDialog>
    </section>
  );
}
