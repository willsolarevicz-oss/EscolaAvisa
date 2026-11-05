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
import { getContatos, iniciarConversa } from '../../services/conversaService';
import { listMeusAlunos } from '../../services/ocorrenciaService';
import { toFieldErrors } from '../../utils/apiErrors';
import styles from '../../styles/FormPage.module.css';
import relationStyles from '../../styles/RelationSection.module.css';

// Admin busca entre todos os alunos ativos; professor só entre os das turmas dele.
const buscarAlunosAdmin = (busca, { signal }) =>
  listAlunos({ ativo: 'true', pageSize: 6, busca }, { signal }).then((data) => data.items);
const buscarAlunosProfessor = (busca, { signal }) => listMeusAlunos(busca, { signal });

/**
 * Carrega os contatos possíveis.
 * Responsável: uma vez (seus alunos + professores). Escola: os responsáveis do aluno escolhido.
 * `key` identifica a busca; "carregando" = resultado guardado é de outra key.
 */
function useContatos(isResponsavel, alunoId) {
  const key = isResponsavel ? 'responsavel' : alunoId;
  const [result, setResult] = useState({ key: null, data: null, error: '' });

  useEffect(() => {
    if (!key) return undefined;
    const controller = new AbortController();
    getContatos(isResponsavel ? undefined : alunoId, { signal: controller.signal })
      .then((data) => setResult({ key, data, error: '' }))
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setResult({ key, data: null, error: getApiErrorMessage(error, 'Não foi possível carregar os contatos.') });
      });
    return () => controller.abort();
  }, [key, isResponsavel, alunoId]);

  const atual = result.key === key;
  return { loading: Boolean(key) && !atual, data: atual ? result.data : null, error: atual ? result.error : '' };
}

function validate(form, isResponsavel) {
  const errors = {};
  if (isResponsavel ? !form.alunoId : !form.aluno) errors.alunoId = 'Selecione o aluno.';
  if (isResponsavel && !form.destino) errors.destino = 'Escolha com quem quer falar.';
  if (!isResponsavel && !form.responsavelId) errors.responsavelId = 'Selecione o responsável.';
  if (form.assunto.trim().length < 3) errors.assunto = 'Informe o assunto (mínimo 3 caracteres).';
  if (!form.mensagem.trim()) errors.mensagem = 'Escreva a mensagem.';
  return errors;
}

export function NovaConversaPage() {
  const { user } = useAuth();
  const isResponsavel = user.tipoUsuario === 'RESPONSAVEL';
  const isProfessor = user.tipoUsuario === 'PROFESSOR';
  const navigate = useNavigate();

  // destino (responsável): 'SECRETARIA' ou o id de um professor.
  const [form, setForm] = useState({ alunoId: '', aluno: null, destino: '', responsavelId: '', assunto: '', mensagem: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const contatos = useContatos(isResponsavel, form.aluno?.id);
  const alunosDoResponsavel = isResponsavel ? (contatos.data?.alunos ?? []) : [];
  const alunoSelecionado = alunosDoResponsavel.find((a) => a.id === form.alunoId);
  const responsaveis = !isResponsavel ? (contatos.data?.responsaveis ?? []) : [];

  function update(change) {
    setForm((prev) => ({ ...prev, ...change }));
    setErrors((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(change).map((k) => [k, undefined])) }));
    setSubmitError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;
    const validation = validate(form, isResponsavel);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    const payload = isResponsavel
      ? {
          alunoId: form.alunoId,
          canal: form.destino === 'SECRETARIA' ? 'SECRETARIA' : 'PROFESSOR',
          professorId: form.destino === 'SECRETARIA' ? null : form.destino,
        }
      : { alunoId: form.aluno.id, responsavelId: form.responsavelId };

    setSaving(true);
    try {
      const conversa = await iniciarConversa({ ...payload, assunto: form.assunto.trim(), mensagem: form.mensagem.trim() });
      navigate(`/mensagens/${conversa.id}`, { state: { flash: { type: 'success', message: 'Conversa iniciada.' } } });
    } catch (error) {
      const fieldErrors = toFieldErrors(error);
      // professorId/canal do backend correspondem ao campo "Falar com" da tela.
      if (fieldErrors.professorId || fieldErrors.canal) fieldErrors.destino = fieldErrors.professorId ?? fieldErrors.canal;
      setErrors(fieldErrors);
      setSubmitError(getApiErrorMessage(error, 'Não foi possível iniciar a conversa.'));
      setSaving(false);
    }
  }

  const destinoOptions = [
    { value: '', label: form.alunoId ? 'Selecione' : 'Escolha o aluno primeiro' },
    ...(form.alunoId ? [{ value: 'SECRETARIA', label: 'Secretaria da escola' }] : []),
    ...(alunoSelecionado?.professores ?? []).map((p) => ({
      value: p.id,
      label: `Prof. ${p.nome} (${p.disciplinas.join(', ')})`,
    })),
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Nova conversa"
        description={
          isResponsavel
            ? 'Escolha o aluno e com quem quer falar: a secretaria ou um professor dele.'
            : isProfessor
              ? 'Converse com o responsável de um aluno das suas turmas.'
              : 'Converse com o responsável de um aluno em nome da secretaria.'
        }
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Mensagens', to: '/mensagens' },
          { label: 'Nova conversa' },
        ]}
      />

      <section className={styles.card} aria-labelledby="nova-conversa-title">
        <div className={styles.cardHeader}>
          <h3 id="nova-conversa-title" className={styles.cardTitle}>
            Para quem e sobre o quê
          </h3>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError && <Alert type="error">{submitError}</Alert>}
          {contatos.error && <Alert type="error">{contatos.error}</Alert>}
          {isResponsavel && contatos.data && alunosDoResponsavel.length === 0 && (
            <Alert type="warning">
              Nenhum aluno vinculado a você pode receber comunicações. Fale com a secretaria para revisar o cadastro.
            </Alert>
          )}

          {isResponsavel ? (
            <div className={styles.grid}>
              <SelectField
                label="Aluno"
                name="alunoId"
                options={[
                  { value: '', label: contatos.loading ? 'Carregando...' : 'Selecione o aluno' },
                  ...alunosDoResponsavel.map((a) => ({ value: a.id, label: a.nome })),
                ]}
                value={form.alunoId}
                onChange={(event) => update({ alunoId: event.target.value, destino: '' })}
                error={errors.alunoId}
                disabled={saving || contatos.loading}
              />
              <SelectField
                label="Falar com"
                name="destino"
                options={destinoOptions}
                value={form.destino}
                onChange={(event) => update({ destino: event.target.value })}
                error={errors.destino}
                disabled={saving || !form.alunoId}
              />
            </div>
          ) : (
            <>
              {form.aluno ? (
                <div className={relationStyles.selected}>
                  <div className={relationStyles.personText}>
                    <strong>{form.aluno.nome}</strong>
                    <span>Matrícula {form.aluno.matricula}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => update({ aluno: null, responsavelId: '' })} disabled={saving}>
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
                    onSelect={(aluno) => update({ aluno, alunoId: undefined, responsavelId: '' })}
                    emptyMessage={isProfessor ? 'Nenhum aluno das suas turmas encontrado.' : 'Nenhum aluno ativo encontrado.'}
                  />
                  {errors.alunoId && <p className={relationStyles.fieldError}>{errors.alunoId}</p>}
                </>
              )}

              {form.aluno && contatos.data && responsaveis.length === 0 && (
                <Alert type="warning">Este aluno não tem responsável ativo autorizado a receber comunicações.</Alert>
              )}
              {form.aluno && (
                <SelectField
                  label="Responsável"
                  name="responsavelId"
                  options={[
                    { value: '', label: contatos.loading ? 'Carregando...' : 'Selecione o responsável' },
                    ...responsaveis.map((r) => ({
                      value: r.id,
                      label: `${r.nome} (${r.parentesco}${r.principal ? ', principal' : ''})`,
                    })),
                  ]}
                  value={form.responsavelId}
                  onChange={(event) => update({ responsavelId: event.target.value })}
                  error={errors.responsavelId}
                  disabled={saving || contatos.loading || responsaveis.length === 0}
                />
              )}
            </>
          )}

          <TextField
            label="Assunto"
            name="assunto"
            icon={Type}
            placeholder="Ex.: Dúvida sobre a lição de casa"
            autoComplete="off"
            value={form.assunto}
            onChange={(event) => update({ assunto: event.target.value })}
            error={errors.assunto}
            disabled={saving}
            maxLength={150}
          />

          <TextAreaField
            label="Mensagem"
            name="mensagem"
            placeholder="Escreva sua mensagem. Quebras de linha são mantidas."
            value={form.mensagem}
            onChange={(event) => update({ mensagem: event.target.value })}
            error={errors.mensagem}
            disabled={saving}
            maxLength={5000}
          />

          <div className={styles.formActions}>
            <Button variant="secondary" to="/mensagens">
              Cancelar
            </Button>
            <Button type="submit" icon={Send} loading={saving} loadingText="Enviando...">
              Enviar mensagem
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
