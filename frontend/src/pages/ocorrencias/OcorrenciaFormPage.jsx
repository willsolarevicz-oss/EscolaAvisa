import { CalendarDays, Save } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { SearchPicker } from '../../components/SearchPicker';
import { SelectField } from '../../components/SelectField';
import { TextAreaField } from '../../components/TextAreaField';
import { TextField } from '../../components/TextField';
import { useAuth } from '../../hooks/useAuth';
import { useEntityLoader } from '../../hooks/useEntityLoader';
import { getAluno, listAlunos } from '../../services/alunoService';
import { getApiErrorMessage } from '../../services/api';
import { createOcorrencia, listMeusAlunos } from '../../services/ocorrenciaService';
import { toFieldErrors } from '../../utils/apiErrors';
import { TIPO_OCORRENCIA_OPTIONS, todayIso } from '../../utils/formatters';
import styles from '../../styles/FormPage.module.css';
import relationStyles from '../../styles/RelationSection.module.css';
import { urlDaLista } from '../../utils/listaMemoria';
import { alunoDaNavegacao } from '../../utils/navegacao';

const TIPO_SELECT_OPTIONS = [{ value: '', label: 'Selecione o tipo' }, ...TIPO_OCORRENCIA_OPTIONS];

// Admin escolhe entre todos os alunos ativos; professor, só entre os das turmas em que leciona.
const buscarAlunosAdmin = (busca, { signal }) =>
  listAlunos({ ativo: 'true', pageSize: 6, busca }, { signal }).then((data) => data.items);
const buscarAlunosProfessor = (busca, { signal }) => listMeusAlunos(busca, { signal });

function validate(form) {
  const errors = {};
  if (!form.aluno) errors.alunoId = 'Selecione o aluno.';
  if (!form.tipo) errors.tipo = 'Selecione o tipo.';
  if (!form.descricao.trim()) errors.descricao = 'Descreva a ocorrência.';
  if (!form.dataOcorrencia) errors.dataOcorrencia = 'Informe a data.';
  else if (form.dataOcorrencia > todayIso()) errors.dataOcorrencia = 'A data não pode estar no futuro.';
  return errors;
}

export function OcorrenciaFormPage() {
  const { user } = useAuth();
  const isProfessor = user.tipoUsuario === 'PROFESSOR';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Vindo de "Minhas turmas" (professor), o aluno chega na navegação, já escolhido.
  const [form, setForm] = useState(() => ({
    aluno: alunoDaNavegacao(location.state),
    tipo: '',
    descricao: '',
    dataOcorrencia: todayIso(),
  }));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  // Vindo da tela do aluno (?alunoId=...), o aluno já chega selecionado (só admin acessa /alunos).
  const alunoIdInicial = isProfessor ? null : searchParams.get('alunoId');
  useEntityLoader(getAluno, alunoIdInicial, {
    onLoad: (aluno) => setForm((prev) => (prev.aluno ? prev : { ...prev, aluno })),
  });

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
      const { ocorrencia, message } = await createOcorrencia({
        alunoId: form.aluno.id,
        tipo: form.tipo,
        descricao: form.descricao.trim(),
        dataOcorrencia: form.dataOcorrencia,
      });
      navigate(`/ocorrencias/${ocorrencia.id}`, { state: { flash: { type: 'success', message } } });
    } catch (error) {
      setErrors(toFieldErrors(error));
      setSubmitError(getApiErrorMessage(error, 'Não foi possível registrar a ocorrência.'));
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Registrar ocorrência"
        description="Depois de registrada, a ocorrência não pode ser editada (pode ser arquivada)."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Ocorrências', to: urlDaLista('/ocorrencias') },
          { label: 'Registrar' },
        ]}
      />

      <section className={styles.card} aria-labelledby="ocorrencia-title">
        <div className={styles.cardHeader}>
          <h3 id="ocorrencia-title" className={styles.cardTitle}>
            Dados da ocorrência
          </h3>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError && <Alert type="error">{submitError}</Alert>}

          {form.aluno ? (
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
                fetchItems={isProfessor ? buscarAlunosProfessor : buscarAlunosAdmin}
                getTitle={(aluno) => aluno.nome}
                getSubtitle={(aluno) => `Matrícula ${aluno.matricula}`}
                onSelect={(aluno) => update({ aluno, alunoId: undefined })}
                emptyMessage={
                  isProfessor ? 'Nenhum aluno ativo nas turmas em que você leciona.' : 'Nenhum aluno ativo encontrado.'
                }
              />
              {errors.alunoId && <p className={relationStyles.fieldError}>{errors.alunoId}</p>}
            </>
          )}

          <div className={styles.grid}>
            <SelectField
              label="Tipo"
              name="tipo"
              options={TIPO_SELECT_OPTIONS}
              value={form.tipo}
              onChange={(event) => update({ tipo: event.target.value })}
              error={errors.tipo}
              disabled={saving}
            />
            <TextField
              label="Data da ocorrência"
              name="dataOcorrencia"
              type="date"
              icon={CalendarDays}
              min="2000-01-01"
              max={todayIso()}
              value={form.dataOcorrencia}
              onChange={(event) => update({ dataOcorrencia: event.target.value })}
              error={errors.dataOcorrencia}
              disabled={saving}
            />
          </div>

          <TextAreaField
            label="Descrição"
            name="descricao"
            placeholder="Descreva o que aconteceu, de forma objetiva."
            value={form.descricao}
            onChange={(event) => update({ descricao: event.target.value })}
            error={errors.descricao}
            disabled={saving}
            maxLength={5000}
          />

          <p className={styles.muted}>
            Os responsáveis <strong>ativos</strong> e <strong>autorizados a receber comunicações</strong> do aluno
            poderão ver a ocorrência e dar ciência.
          </p>

          <div className={styles.formActions}>
            <Button variant="secondary" to={urlDaLista('/ocorrencias')}>
              Cancelar
            </Button>
            <Button type="submit" icon={Save} loading={saving} loadingText="Registrando...">
              Registrar ocorrência
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
