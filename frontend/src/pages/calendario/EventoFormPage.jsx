import { ArrowLeft, CalendarDays, Save, Trash2, Type } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { SelectField } from '../../components/SelectField';
import { TextAreaField } from '../../components/TextAreaField';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../hooks/useAuth';
import { useEntityLoader } from '../../hooks/useEntityLoader';
import { useTurmasDisponiveis } from '../../hooks/useTurmasDisponiveis';
import { getApiErrorMessage } from '../../services/api';
import { createEvento, deleteEvento, getEvento, updateEvento } from '../../services/eventoService';
import { toFieldErrors } from '../../utils/apiErrors';
import { isMesValido, TIPO_EVENTO_OPTIONS } from '../../utils/calendario';
import { turnoLabel } from '../../utils/formatters';
import styles from '../../styles/FormPage.module.css';

const TIPO_SELECT_OPTIONS = [{ value: '', label: 'Selecione o tipo' }, ...TIPO_EVENTO_OPTIONS];
const emptyForm = () => ({ titulo: '', tipo: '', dataInicio: '', dataFim: '', turmaId: '', descricao: '' });

function validate(form, isProfessor) {
  const errors = {};
  if (form.titulo.trim().length < 3) errors.titulo = 'Informe um título (mínimo 3 caracteres).';
  if (!form.tipo) errors.tipo = 'Selecione o tipo.';
  if (!form.dataInicio) errors.dataInicio = 'Informe a data.';
  if (form.dataFim && form.dataInicio && form.dataFim < form.dataInicio) {
    errors.dataFim = 'O término não pode ser antes do início.';
  }
  if (isProfessor && !form.turmaId) errors.turmaId = 'Selecione uma das suas turmas.';
  return errors;
}

const calendarioUrl = (mes) => (isMesValido(mes) ? `/calendario?mes=${mes}` : '/calendario');

export function EventoFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const isProfessor = user.tipoUsuario === 'PROFESSOR';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const voltarUrl = calendarioUrl(searchParams.get('voltar'));
  const turmas = useTurmasDisponiveis(isProfessor);

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loader = useEntityLoader(getEvento, id, {
    onLoad: (evento) =>
      setForm({
        titulo: evento.titulo,
        tipo: evento.tipo,
        dataInicio: evento.dataInicio,
        // Evento de um dia: deixa o término em branco, como foi cadastrado.
        dataFim: evento.dataFim === evento.dataInicio ? '' : evento.dataFim,
        turmaId: evento.turma?.id ?? '',
        descricao: evento.descricao ?? '',
      }),
    errorMessage: 'Não foi possível carregar o evento.',
  });
  const evento = loader.data;
  const loadState = isEdit ? loader.status : 'ready';

  const title = isEdit ? 'Editar evento' : 'Novo evento';
  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Calendário', to: voltarUrl },
    { label: isEdit && evento ? evento.titulo : title },
  ];

  // A turma atual do evento continua na lista mesmo se foi desativada depois (senão o select a perderia).
  const turmaItems = [...turmas.items];
  if (evento?.turma && !turmaItems.some((t) => t.id === evento.turma.id)) turmaItems.push(evento.turma);
  const turmaOptions = [
    isProfessor
      ? { value: '', label: turmas.status === 'loading' ? 'Carregando...' : 'Selecione a turma' }
      : { value: '', label: 'Escola toda' },
    ...turmaItems.map((t) => ({
      value: t.id,
      label: t.anoLetivo ? `${t.nome} (${t.anoLetivo} · ${turnoLabel(t.turno)})` : t.nome,
    })),
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
    const validation = validate(form, isProfessor);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const payload = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      dataInicio: form.dataInicio,
      dataFim: form.dataFim || null,
      turmaId: form.turmaId || null,
      descricao: form.descricao.trim() || null,
    };

    setSaving(true);
    try {
      const { evento: saved, message } = isEdit ? await updateEvento(id, payload) : await createEvento(payload);
      // Abre o calendário no mês do evento, para a pessoa ver onde ele ficou.
      navigate(calendarioUrl(saved.dataInicio.slice(0, 7)), { state: { flash: { type: 'success', message } } });
    } catch (error) {
      setErrors(toFieldErrors(error));
      setSubmitError(getApiErrorMessage(error, 'Não foi possível salvar o evento.'));
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const message = await deleteEvento(id);
      navigate(voltarUrl, { state: { flash: { type: 'success', message } } });
    } catch (error) {
      setConfirmDelete(false);
      setDeleting(false);
      setSubmitError(getApiErrorMessage(error, 'Não foi possível excluir o evento.'));
    }
  }

  if (loadState !== 'ready') {
    return (
      <div className={styles.page}>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        {loadState === 'loading' ? (
          <p className={styles.muted}>Carregando evento...</p>
        ) : (
          <>
            <Alert type="error">{loadState === 'notfound' ? 'Evento não encontrado.' : loader.errorMessage}</Alert>
            <div className={styles.formActions}>
              <Button to={voltarUrl} icon={ArrowLeft}>
                Voltar para o calendário
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  const busy = saving || deleting;

  return (
    <div className={styles.page}>
      <PageHeader
        title={isEdit ? evento.titulo : title}
        description={
          isProfessor
            ? 'Eventos de professor são sempre de uma turma em que você leciona (ex.: data de prova).'
            : 'Sem turma, o evento aparece para a escola toda.'
        }
        breadcrumbs={breadcrumbs}
      />

      <section className={styles.card} aria-labelledby="evento-title">
        <div className={styles.cardHeader}>
          <h3 id="evento-title" className={styles.cardTitle}>
            Dados do evento
          </h3>
          {isEdit && (
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => setConfirmDelete(true)} disabled={busy}>
              Excluir
            </Button>
          )}
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError && <Alert type="error">{submitError}</Alert>}
          {isProfessor && turmas.status === 'ready' && turmas.items.length === 0 && (
            <Alert type="warning">
              Você ainda não leciona em nenhuma turma ativa. Peça à administração para atribuir suas turmas.
            </Alert>
          )}
          {turmas.status === 'error' && <Alert type="error">Não foi possível carregar as turmas.</Alert>}

          <div className={styles.grid}>
            <div className={styles.fullRow}>
              <TextField
                label="Título"
                name="titulo"
                icon={Type}
                placeholder="Ex.: Prova de Matemática"
                autoComplete="off"
                value={form.titulo}
                onChange={handleChange}
                error={errors.titulo}
                disabled={busy}
                maxLength={150}
                autoFocus={!isEdit}
              />
            </div>
            <SelectField
              label="Tipo"
              name="tipo"
              options={TIPO_SELECT_OPTIONS}
              value={form.tipo}
              onChange={handleChange}
              error={errors.tipo}
              disabled={busy}
            />
            <SelectField
              label="Turma"
              name="turmaId"
              options={turmaOptions}
              value={form.turmaId}
              onChange={handleChange}
              error={errors.turmaId}
              disabled={busy || turmas.status === 'loading'}
            />
            <TextField
              label="Data"
              name="dataInicio"
              type="date"
              icon={CalendarDays}
              min="2000-01-01"
              max="2100-12-31"
              value={form.dataInicio}
              onChange={handleChange}
              error={errors.dataInicio}
              disabled={busy}
            />
            <TextField
              label="Término (opcional)"
              name="dataFim"
              type="date"
              icon={CalendarDays}
              min={form.dataInicio || '2000-01-01'}
              max="2100-12-31"
              value={form.dataFim}
              onChange={handleChange}
              error={errors.dataFim}
              hint="Só para eventos de vários dias (ex.: recesso)."
              disabled={busy}
            />
          </div>

          <TextAreaField
            label="Descrição (opcional)"
            name="descricao"
            placeholder="Ex.: conteúdo da prova, local da reunião, horário."
            value={form.descricao}
            onChange={handleChange}
            error={errors.descricao}
            disabled={busy}
            maxLength={2000}
          />

          <div className={styles.formActions}>
            <Button variant="secondary" to={voltarUrl}>
              Cancelar
            </Button>
            <Button type="submit" icon={Save} loading={saving} loadingText="Salvando..." disabled={deleting}>
              {isEdit ? 'Salvar alterações' : 'Criar evento'}
            </Button>
          </div>
        </form>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir evento?"
        confirmLabel="Excluir"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      >
        <p>
          <strong>{evento?.titulo}</strong> sai do calendário de todos. Essa ação não pode ser desfeita.
        </p>
      </ConfirmDialog>
    </div>
  );
}

/** Recria o formulário ao trocar de evento na URL. */
export function EventoFormRoute() {
  const { id } = useParams();
  return <EventoFormPage key={id ?? 'novo'} />;
}
