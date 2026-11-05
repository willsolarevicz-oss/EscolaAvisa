import axios from 'axios';
import { Send, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { SearchPicker } from '../../components/SearchPicker';
import { SelectField } from '../../components/SelectField';
import { TextAreaField } from '../../components/TextAreaField';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../hooks/useAuth';
import { listAlunos } from '../../services/alunoService';
import { getApiErrorMessage } from '../../services/api';
import { createAviso, listMinhasTurmas } from '../../services/avisoService';
import { listTurmas } from '../../services/turmaService';
import { toFieldErrors } from '../../utils/apiErrors';
import { PUBLICO_OPTIONS, turnoLabel } from '../../utils/formatters';
import styles from '../../styles/FormPage.module.css';
import relationStyles from '../../styles/RelationSection.module.css';

const buscarAlunos = (busca, { signal }) =>
  listAlunos({ ativo: 'true', pageSize: 6, busca }, { signal }).then((data) => data.items);

/** Turmas que o usuário pode escolher: professor → onde leciona; admin → turmas ativas. */
function useTurmasDisponiveis(isProfessor) {
  const [state, setState] = useState({ status: 'loading', items: [] });

  useEffect(() => {
    const controller = new AbortController();
    const request = isProfessor
      ? listMinhasTurmas({ signal: controller.signal })
      : listTurmas({ ativo: 'true', pageSize: 100 }, { signal: controller.signal }).then((data) => data.items);

    request
      .then((items) => setState({ status: 'ready', items }))
      .catch((error) => {
        if (!axios.isCancel(error)) setState({ status: 'error', items: [] });
      });
    return () => controller.abort();
  }, [isProfessor]);

  return state;
}

function validate(form) {
  const errors = {};
  if (form.titulo.trim().length < 3) errors.titulo = 'Informe um título (mínimo 3 caracteres).';
  if (!form.conteudo.trim()) errors.conteudo = 'Escreva o conteúdo do aviso.';
  if (form.publico === 'TURMA' && !form.turmaId) errors.turmaId = 'Selecione a turma.';
  if (form.publico === 'ALUNO' && !form.aluno) errors.alunoId = 'Selecione o aluno.';
  return errors;
}

export function AvisoFormPage() {
  const { user } = useAuth();
  const isProfessor = user.tipoUsuario === 'PROFESSOR';
  const navigate = useNavigate();
  const turmas = useTurmasDisponiveis(isProfessor);

  // Professor só publica para turmas em que leciona (regra validada também no backend).
  const [form, setForm] = useState({
    titulo: '',
    conteudo: '',
    publico: isProfessor ? 'TURMA' : 'TODOS',
    turmaId: '',
    aluno: null,
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const publicoOptions = isProfessor ? PUBLICO_OPTIONS.filter((o) => o.value === 'TURMA') : PUBLICO_OPTIONS;
  const turmaOptions = [
    { value: '', label: turmas.status === 'loading' ? 'Carregando...' : 'Selecione a turma' },
    ...turmas.items.map((t) => ({ value: t.id, label: `${t.nome} (${t.anoLetivo} · ${turnoLabel(t.turno)})` })),
  ];

  function update(change) {
    setForm((prev) => ({ ...prev, ...change }));
    setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(change).map((k) => [k, undefined])) }));
    setSubmitError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    try {
      const { aviso, message } = await createAviso({
        titulo: form.titulo.trim(),
        conteudo: form.conteudo.trim(),
        publico: form.publico,
        turmaId: form.publico === 'TURMA' ? form.turmaId : null,
        alunoId: form.publico === 'ALUNO' ? form.aluno.id : null,
      });
      navigate(`/avisos/${aviso.id}`, { state: { flash: { type: 'success', message } } });
    } catch (error) {
      setErrors(toFieldErrors(error));
      setSubmitError(getApiErrorMessage(error, 'Não foi possível publicar o aviso.'));
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Novo aviso"
        description="Depois de publicado, o aviso não pode ser editado (pode ser arquivado)."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Avisos', to: '/avisos' },
          { label: 'Novo aviso' },
        ]}
      />

      <section className={styles.card} aria-labelledby="aviso-title">
        <div className={styles.cardHeader}>
          <h3 id="aviso-title" className={styles.cardTitle}>
            Conteúdo e público
          </h3>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError && <Alert type="error">{submitError}</Alert>}
          {isProfessor && turmas.status === 'ready' && turmas.items.length === 0 && (
            <Alert type="warning">
              Você ainda não leciona em nenhuma turma ativa. Peça à administração para atribuir suas turmas.
            </Alert>
          )}
          {turmas.status === 'error' && <Alert type="error">Não foi possível carregar as turmas.</Alert>}

          <div className={styles.fullRow}>
            <TextField
              label="Título"
              name="titulo"
              icon={Type}
              placeholder="Ex.: Reunião de pais e mestres"
              autoComplete="off"
              value={form.titulo}
              onChange={(event) => update({ titulo: event.target.value })}
              error={errors.titulo}
              disabled={saving}
              maxLength={150}
              autoFocus
            />
          </div>

          <TextAreaField
            label="Conteúdo"
            name="conteudo"
            placeholder="Escreva o comunicado. Quebras de linha são mantidas."
            value={form.conteudo}
            onChange={(event) => update({ conteudo: event.target.value })}
            error={errors.conteudo}
            disabled={saving}
            maxLength={10000}
          />

          <div className={styles.grid}>
            <SelectField
              label="Público"
              name="publico"
              options={publicoOptions}
              value={form.publico}
              onChange={(event) => update({ publico: event.target.value, turmaId: '', aluno: null })}
              disabled={saving || isProfessor}
            />
            {form.publico === 'TURMA' && (
              <SelectField
                label="Turma"
                name="turmaId"
                options={turmaOptions}
                value={form.turmaId}
                onChange={(event) => update({ turmaId: event.target.value })}
                error={errors.turmaId}
                disabled={saving || turmas.status !== 'ready'}
              />
            )}
          </div>

          {form.publico === 'ALUNO' &&
            (form.aluno ? (
              <div className={relationStyles.selected}>
                <div className={relationStyles.personText}>
                  <strong>{form.aluno.nome}</strong>
                  <span>Matrícula {form.aluno.matricula}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => update({ aluno: null })} disabled={saving}>
                  Trocar
                </Button>
              </div>
            ) : (
              <>
                <SearchPicker
                  label="Aluno"
                  placeholder="Nome ou matrícula do aluno"
                  fetchItems={buscarAlunos}
                  getTitle={(aluno) => aluno.nome}
                  getSubtitle={(aluno) => `Matrícula ${aluno.matricula}`}
                  onSelect={(aluno) => update({ aluno, alunoId: undefined })}
                  emptyMessage="Nenhum aluno ativo encontrado."
                />
                {errors.alunoId && <p className={relationStyles.fieldError}>{errors.alunoId}</p>}
              </>
            ))}

          <p className={styles.muted}>
            Recebem o aviso os responsáveis <strong>ativos</strong> e <strong>autorizados a receber comunicações</strong>{' '}
            dos alunos ativos do público escolhido.
          </p>

          <div className={styles.formActions}>
            <Button variant="secondary" to="/avisos">
              Cancelar
            </Button>
            <Button type="submit" icon={Send} loading={saving} loadingText="Publicando...">
              Publicar aviso
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
