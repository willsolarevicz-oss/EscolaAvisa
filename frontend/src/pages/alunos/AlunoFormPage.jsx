import { ArrowLeft, CalendarDays, Hash, Save, User } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { TextField } from '../../components/TextField';
import { useEntityLoader } from '../../hooks/useEntityLoader';
import { useFlashMessage } from '../../hooks/useFlashMessage';
import { createAluno, getAluno, updateAluno } from '../../services/alunoService';
import { getApiErrorMessage } from '../../services/api';
import { toFieldErrors } from '../../utils/apiErrors';
import { todayIso, turnoLabel } from '../../utils/formatters';
import styles from '../../styles/FormPage.module.css';
import { AlunoOcorrenciasSection } from './AlunoOcorrenciasSection';
import { AlunoResponsaveisSection } from './AlunoResponsaveisSection';
import { urlDaLista } from '../../utils/listaMemoria';

const MATRICULA_REGEX = /^[A-Za-z0-9./-]+$/;
const EMPTY_FORM = { nome: '', matricula: '', dataNascimento: '' };

function validateForm(form) {
  const errors = {};
  if (form.nome.trim().length < 2) errors.nome = 'Informe o nome (mínimo 2 caracteres).';

  const matricula = form.matricula.trim();
  if (!matricula) errors.matricula = 'Informe a matrícula.';
  else if (!MATRICULA_REGEX.test(matricula)) errors.matricula = 'Use apenas letras, números, ponto, barra e hífen.';

  // Datas AAAA-MM-DD podem ser comparadas como texto.
  if (!form.dataNascimento) errors.dataNascimento = 'Informe a data de nascimento.';
  else if (form.dataNascimento > todayIso()) errors.dataNascimento = 'A data de nascimento não pode estar no futuro.';
  else if (form.dataNascimento < '1900-01-01') errors.dataNascimento = 'Data de nascimento inválida.';
  return errors;
}

/** Turma(s) com matrícula ativa — a matrícula é feita na tela da turma. */
function TurmaAtual({ turmas }) {
  if (!turmas?.length) return <>Sem turma no momento. A matrícula é feita em Turmas.</>;
  return (
    <>
      Turma atual:{' '}
      {turmas.map((turma, index) => (
        <span key={turma.id}>
          {index > 0 && ', '}
          <Link to={`/turmas/${turma.id}/editar`}>{turma.nome}</Link> ({turma.anoLetivo} · {turnoLabel(turma.turno)})
        </span>
      ))}
    </>
  );
}

export function AlunoFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [flash, setFlash] = useFlashMessage();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const loader = useEntityLoader(getAluno, id, {
    onLoad: (data) => setForm({ nome: data.nome, matricula: data.matricula, dataNascimento: data.dataNascimento }),
    errorMessage: 'Não foi possível carregar o aluno.',
  });
  const aluno = loader.data;
  const loadState = isEdit ? loader.status : 'ready';
  const loadError = loader.errorMessage;

  const title = isEdit ? 'Editar aluno' : 'Novo aluno';
  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Alunos', to: urlDaLista('/alunos') },
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

    const validation = validateForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const payload = {
      nome: form.nome.trim(),
      matricula: form.matricula.trim(),
      dataNascimento: form.dataNascimento,
    };

    setSaving(true);
    setSubmitError('');
    try {
      if (isEdit) {
        const saved = await updateAluno(id, payload);
        navigate(urlDaLista('/alunos'), { state: { flash: { type: 'success', message: `Dados de ${saved.nome} atualizados.` } } });
      } else {
        // Depois de cadastrar, vai para a edição: é lá que se vinculam os responsáveis.
        const saved = await createAluno(payload);
        navigate(`/alunos/${saved.id}/editar`, {
          state: { flash: { type: 'success', message: 'Aluno cadastrado. Agora vincule os responsáveis abaixo.' } },
        });
      }
    } catch (error) {
      setErrors(toFieldErrors(error));
      setSubmitError(getApiErrorMessage(error, 'Não foi possível salvar o aluno.'));
      setSaving(false);
    }
  }

  if (loadState === 'loading') {
    return (
      <div className={styles.page}>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <p className={styles.muted}>Carregando dados do aluno...</p>
      </div>
    );
  }

  if (loadState === 'notfound' || loadState === 'error') {
    return (
      <div className={styles.page}>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <Alert type="error">{loadState === 'notfound' ? 'Aluno não encontrado.' : loadError}</Alert>
        <div className={styles.formActions}>
          {loadState === 'error' && (
            <Button variant="secondary" onClick={loader.reload}>
              Tentar novamente
            </Button>
          )}
          <Button to={urlDaLista('/alunos')} icon={ArrowLeft}>
            Voltar para alunos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={title}
        description={isEdit ? <TurmaAtual turmas={aluno.turmas} /> : 'Cadastre os dados do aluno.'}
        breadcrumbs={breadcrumbs}
      />

      {flash && (
        <Alert type={flash.type} onClose={() => setFlash(null)}>
          {flash.message}
        </Alert>
      )}

      <section className={styles.card} aria-labelledby="dados-aluno-title">
        <div className={styles.cardHeader}>
          <h3 id="dados-aluno-title" className={styles.cardTitle}>
            Dados do aluno
          </h3>
          {isEdit && (
            <div className={styles.badges}>
              <Badge tone={aluno.ativo ? 'success' : 'danger'}>{aluno.ativo ? 'Ativo' : 'Inativo'}</Badge>
            </div>
          )}
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError && <Alert type="error">{submitError}</Alert>}

          <div className={styles.grid}>
            <div className={styles.fullRow}>
              <TextField
                label="Nome completo"
                name="nome"
                icon={User}
                autoComplete="off"
                value={form.nome}
                onChange={handleChange}
                error={errors.nome}
                disabled={saving}
                maxLength={150}
                autoFocus={!isEdit}
              />
            </div>
            <TextField
              label="Matrícula"
              name="matricula"
              icon={Hash}
              autoComplete="off"
              placeholder="Ex.: 2026-0001"
              value={form.matricula}
              onChange={handleChange}
              error={errors.matricula}
              hint="Letras são salvas em maiúsculas."
              disabled={saving}
              maxLength={30}
            />
            <TextField
              label="Data de nascimento"
              name="dataNascimento"
              type="date"
              icon={CalendarDays}
              min="1900-01-01"
              max={todayIso()}
              value={form.dataNascimento}
              onChange={handleChange}
              error={errors.dataNascimento}
              disabled={saving}
            />
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" to={urlDaLista('/alunos')}>
              Cancelar
            </Button>
            <Button type="submit" icon={Save} loading={saving} loadingText="Salvando...">
              {isEdit ? 'Salvar alterações' : 'Cadastrar aluno'}
            </Button>
          </div>
        </form>
      </section>

      {isEdit ? (
        <>
          <AlunoResponsaveisSection alunoId={aluno.id} alunoNome={aluno.nome} initialVinculos={aluno.responsaveis} />
          <AlunoOcorrenciasSection alunoId={aluno.id} />
        </>
      ) : (
        <p className={styles.muted}>Os responsáveis são vinculados depois que o aluno for cadastrado.</p>
      )}
    </div>
  );
}

/** Recria o formulário ao trocar de aluno (/alunos/A/editar → /alunos/B/editar). */
export function AlunoFormRoute() {
  const { id } = useParams();
  return <AlunoFormPage key={id ?? 'novo'} />;
}
