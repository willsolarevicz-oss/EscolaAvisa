import axios from 'axios';
import { ArrowLeft, CalendarDays, Save, School } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { SelectField } from '../../components/SelectField';
import { TextField } from '../../components/TextField';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { getApiErrorMessage } from '../../services/api';
import { createTurma, getTurma, updateTurma } from '../../services/turmaService';
import { toFieldErrors } from '../../utils/apiErrors';
import { TURNO_OPTIONS, turnoLabel } from '../../utils/formatters';
import styles from '../../styles/FormPage.module.css';
import { TurmaAlunosSection } from './TurmaAlunosSection';
import { TurmaProfessoresSection } from './TurmaProfessoresSection';

const TURNO_SELECT_OPTIONS = [{ value: '', label: 'Selecione o turno' }, ...TURNO_OPTIONS];
const emptyForm = () => ({ nome: '', anoLetivo: String(new Date().getFullYear()), turno: '', descricao: '' });

function validateForm(form) {
  const errors = {};
  if (!form.nome.trim()) errors.nome = 'Informe o nome da turma.';
  const ano = Number(form.anoLetivo);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) errors.anoLetivo = 'Informe um ano entre 2000 e 2100.';
  if (!form.turno) errors.turno = 'Selecione o turno.';
  return errors;
}

export function TurmaFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [flash, setFlash] = useFlashMessage();

  const [form, setForm] = useState(emptyForm);
  const [turma, setTurma] = useState(null);
  const [loadState, setLoadState] = useState(isEdit ? 'loading' : 'ready'); // loading | ready | notfound | error
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return undefined;
    const controller = new AbortController();
    getTurma(id, { signal: controller.signal })
      .then((data) => {
        setTurma(data);
        setForm({
          nome: data.nome,
          anoLetivo: String(data.anoLetivo),
          turno: data.turno,
          descricao: data.descricao ?? '',
        });
        setLoadState('ready');
      })
      .catch((error) => {
        if (axios.isCancel(error)) return;
        if (error.response?.status === 404) {
          setLoadState('notfound');
        } else {
          setLoadError(getApiErrorMessage(error, 'Não foi possível carregar a turma.'));
          setLoadState('error');
        }
      });
    return () => controller.abort();
  }, [id, isEdit]);

  const title = isEdit ? 'Editar turma' : 'Nova turma';
  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Turmas', to: '/turmas' },
    { label: isEdit && turma ? turma.nome : title },
  ];

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    const validation = validateForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const payload = {
      nome: form.nome.trim(),
      anoLetivo: Number(form.anoLetivo),
      turno: form.turno,
      descricao: form.descricao.trim() || null,
    };

    setSaving(true);
    setSubmitError('');
    try {
      if (isEdit) {
        const saved = await updateTurma(id, payload);
        navigate('/turmas', { state: { flash: { type: 'success', message: `Turma ${saved.nome} atualizada.` } } });
      } else {
        // Depois de cadastrar, vai para a edição: é lá que se matriculam alunos e se atribuem professores.
        const saved = await createTurma(payload);
        navigate(`/turmas/${saved.id}/editar`, {
          state: { flash: { type: 'success', message: 'Turma cadastrada. Agora matricule os alunos e atribua os professores.' } },
        });
      }
    } catch (error) {
      setErrors(toFieldErrors(error));
      setSubmitError(getApiErrorMessage(error, 'Não foi possível salvar a turma.'));
      setSaving(false);
    }
  }

  if (loadState !== 'ready') {
    return (
      <div className={styles.page}>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        {loadState === 'loading' ? (
          <p className={styles.muted}>Carregando dados da turma...</p>
        ) : (
          <>
            <Alert type="error">{loadState === 'notfound' ? 'Turma não encontrada.' : loadError}</Alert>
            <div className={styles.formActions}>
              <Button to="/turmas" icon={ArrowLeft}>
                Voltar para turmas
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={isEdit ? turma.nome : title}
        description={
          isEdit
            ? `${turma.anoLetivo} · ${turnoLabel(turma.turno)}`
            : 'Cadastre a turma; depois matricule os alunos e atribua os professores.'
        }
        breadcrumbs={breadcrumbs}
      />

      {flash && (
        <Alert type={flash.type} onClose={() => setFlash(null)}>
          {flash.message}
        </Alert>
      )}

      <section className={styles.card} aria-labelledby="dados-turma-title">
        <div className={styles.cardHeader}>
          <h3 id="dados-turma-title" className={styles.cardTitle}>
            Dados da turma
          </h3>
          {isEdit && (
            <div className={styles.badges}>
              <Badge tone={turma.ativo ? 'success' : 'danger'}>{turma.ativo ? 'Ativa' : 'Inativa'}</Badge>
            </div>
          )}
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError && <Alert type="error">{submitError}</Alert>}
          <div className={styles.grid}>
            <TextField
              label="Nome"
              name="nome"
              icon={School}
              placeholder="Ex.: 6º Ano A"
              autoComplete="off"
              value={form.nome}
              onChange={handleChange}
              error={errors.nome}
              disabled={saving}
              maxLength={100}
              autoFocus={!isEdit}
            />
            <TextField
              label="Ano letivo"
              name="anoLetivo"
              type="number"
              icon={CalendarDays}
              min={2000}
              max={2100}
              value={form.anoLetivo}
              onChange={handleChange}
              error={errors.anoLetivo}
              hint={isEdit ? 'Não pode ser alterado depois que a turma tiver matrículas.' : undefined}
              disabled={saving}
            />
            <SelectField
              label="Turno"
              name="turno"
              options={TURNO_SELECT_OPTIONS}
              value={form.turno}
              onChange={handleChange}
              error={errors.turno}
              disabled={saving}
            />
            <TextField
              label="Descrição (opcional)"
              name="descricao"
              placeholder="Ex.: Sala 12, bloco B"
              autoComplete="off"
              value={form.descricao}
              onChange={handleChange}
              error={errors.descricao}
              disabled={saving}
              maxLength={500}
            />
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" to="/turmas">
              Cancelar
            </Button>
            <Button type="submit" icon={Save} loading={saving} loadingText="Salvando...">
              {isEdit ? 'Salvar alterações' : 'Cadastrar turma'}
            </Button>
          </div>
        </form>
      </section>

      {isEdit ? (
        <>
          <TurmaAlunosSection turma={turma} initialAlunos={turma.alunos} />
          <TurmaProfessoresSection turma={turma} initialProfessores={turma.professores} />
        </>
      ) : (
        <p className={styles.muted}>Alunos e professores são adicionados depois que a turma for cadastrada.</p>
      )}
    </div>
  );
}

/** Recria o formulário ao trocar de turma na URL. */
export function TurmaFormRoute() {
  const { id } = useParams();
  return <TurmaFormPage key={id ?? 'nova'} />;
}
