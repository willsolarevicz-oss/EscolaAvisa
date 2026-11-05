import { ArrowLeft, BookOpen, Save } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { TextField } from '../../components/TextField';
import { useEntityLoader } from '../../hooks/useEntityLoader';
import { getApiErrorMessage } from '../../services/api';
import { createDisciplina, getDisciplina, updateDisciplina } from '../../services/disciplinaService';
import { toFieldErrors } from '../../utils/apiErrors';
import styles from '../../styles/FormPage.module.css';
import { urlDaLista } from '../../utils/listaMemoria';

const EMPTY_FORM = { nome: '', descricao: '' };

export function DisciplinaFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const loader = useEntityLoader(getDisciplina, id, {
    onLoad: (disciplina) => setForm({ nome: disciplina.nome, descricao: disciplina.descricao ?? '' }),
    errorMessage: 'Não foi possível carregar a disciplina.',
  });
  const loadState = isEdit ? loader.status : 'ready';
  const loadError = loader.errorMessage;

  const title = isEdit ? 'Editar disciplina' : 'Nova disciplina';
  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Disciplinas', to: urlDaLista('/disciplinas') },
    { label: title },
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
    if (form.nome.trim().length < 2) {
      setErrors({ nome: 'Informe o nome (mínimo 2 caracteres).' });
      return;
    }

    const payload = { nome: form.nome.trim(), descricao: form.descricao.trim() || null };
    setSaving(true);
    setSubmitError('');
    try {
      const saved = isEdit ? await updateDisciplina(id, payload) : await createDisciplina(payload);
      navigate(urlDaLista('/disciplinas'), {
        state: {
          flash: {
            type: 'success',
            message: isEdit ? `Disciplina ${saved.nome} atualizada.` : `Disciplina ${saved.nome} cadastrada.`,
          },
        },
      });
    } catch (error) {
      setErrors(toFieldErrors(error));
      setSubmitError(getApiErrorMessage(error, 'Não foi possível salvar a disciplina.'));
      setSaving(false);
    }
  }

  if (loadState !== 'ready') {
    return (
      <div className={styles.page}>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        {loadState === 'loading' ? (
          <p className={styles.muted}>Carregando...</p>
        ) : (
          <>
            <Alert type="error">{loadState === 'notfound' ? 'Disciplina não encontrada.' : loadError}</Alert>
            <div className={styles.formActions}>
              <Button to={urlDaLista('/disciplinas')} icon={ArrowLeft}>
                Voltar para disciplinas
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader title={title} breadcrumbs={breadcrumbs} />

      <section className={styles.card} aria-labelledby="disciplina-title">
        <div className={styles.cardHeader}>
          <h3 id="disciplina-title" className={styles.cardTitle}>
            Dados da disciplina
          </h3>
        </div>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError && <Alert type="error">{submitError}</Alert>}
          <div className={styles.grid}>
            <TextField
              label="Nome"
              name="nome"
              icon={BookOpen}
              placeholder="Ex.: Matemática"
              autoComplete="off"
              value={form.nome}
              onChange={handleChange}
              error={errors.nome}
              disabled={saving}
              maxLength={100}
              autoFocus={!isEdit}
            />
            <TextField
              label="Descrição (opcional)"
              name="descricao"
              autoComplete="off"
              value={form.descricao}
              onChange={handleChange}
              error={errors.descricao}
              disabled={saving}
              maxLength={500}
            />
          </div>
          <div className={styles.formActions}>
            <Button variant="secondary" to={urlDaLista('/disciplinas')}>
              Cancelar
            </Button>
            <Button type="submit" icon={Save} loading={saving} loadingText="Salvando...">
              {isEdit ? 'Salvar alterações' : 'Cadastrar disciplina'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

/** Recria o formulário ao trocar de disciplina na URL. */
export function DisciplinaFormRoute() {
  const { id } = useParams();
  return <DisciplinaFormPage key={id ?? 'nova'} />;
}
