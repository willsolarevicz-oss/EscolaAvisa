import { Link2, Pencil, Trash2, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { CheckboxField } from '../../components/CheckboxField';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { SearchPicker } from '../../components/SearchPicker';
import { TextField } from '../../components/TextField';
import { createVinculo, listVinculos, removeVinculo, updateVinculo } from '../../services/alunoService';
import { getApiErrorMessage } from '../../services/api';
import { toFieldErrors } from '../../utils/apiErrors';
import { listUsuarios } from '../../services/usuarioService';
import { getInitials, maskTelefone } from '../../utils/formatters';
import formStyles from '../../styles/FormPage.module.css';
import styles from '../../styles/RelationSection.module.css';

const PARENTESCO_SUGESTOES = [
  'Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio', 'Irmã', 'Irmão', 'Madrasta', 'Padrasto', 'Tutor(a) legal', 'Outro',
];

// Só responsáveis ativos: vincular um usuário desativado é recusado pelo backend.
const buscarResponsaveis = (busca, { signal }) =>
  listUsuarios({ tipo: 'RESPONSAVEL', ativo: 'true', pageSize: 6, busca }, { signal }).then((data) => data.items);

/** Campos comuns a "vincular" e "editar vínculo". */
function VinculoFields({ values, onChange, errors, disabled }) {
  return (
    <div className={styles.fields}>
      <TextField
        label="Parentesco"
        name="parentesco"
        list="parentesco-sugestoes"
        placeholder="Ex.: Mãe, Pai, Avó..."
        value={values.parentesco}
        onChange={(event) => onChange({ parentesco: event.target.value })}
        error={errors.parentesco}
        disabled={disabled}
        maxLength={50}
      />
      <datalist id="parentesco-sugestoes">
        {PARENTESCO_SUGESTOES.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <CheckboxField
        label="Responsável principal"
        description="Contato preferencial da escola. Só um por aluno: marcar aqui desmarca o anterior."
        checked={values.responsavelPrincipal}
        onChange={(event) => onChange({ responsavelPrincipal: event.target.checked })}
        disabled={disabled}
      />
      <CheckboxField
        label="Autorizado a receber comunicações"
        description="Recebe avisos e comunicados sobre este aluno."
        checked={values.autorizadoReceberComunicacoes}
        onChange={(event) => onChange({ autorizadoReceberComunicacoes: event.target.checked })}
        disabled={disabled}
      />
    </div>
  );
}

/** Painel "Vincular responsável": escolhe um usuário RESPONSAVEL ativo e define o vínculo. */
function AddVinculoPanel({ alunoId, vinculos, onCancel, onSaved }) {
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState({
    parentesco: '',
    // Primeiro responsável vinculado já nasce como principal (dá para desmarcar).
    responsavelPrincipal: !vinculos.some((v) => v.responsavelPrincipal),
    autorizadoReceberComunicacoes: true,
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const linkedIds = new Set(vinculos.map((v) => v.responsavel.usuarioId));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selected) return;
    if (!values.parentesco.trim()) {
      setErrors({ parentesco: 'Informe o parentesco.' });
      return;
    }

    setSaving(true);
    setSubmitError('');
    try {
      const vinculo = await createVinculo(alunoId, {
        usuarioId: selected.id,
        parentesco: values.parentesco.trim(),
        responsavelPrincipal: values.responsavelPrincipal,
        autorizadoReceberComunicacoes: values.autorizadoReceberComunicacoes,
      });
      onSaved(`Vínculo com ${vinculo.responsavel.nome} (${vinculo.parentesco}) criado.`);
    } catch (error) {
      setErrors(toFieldErrors(error));
      setSubmitError(getApiErrorMessage(error, 'Não foi possível vincular o responsável.'));
      setSaving(false);
    }
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit} noValidate aria-label="Vincular responsável">
      <div className={styles.panelHeader}>
        <h4 className={styles.panelTitle}>Vincular responsável</h4>
        <button type="button" className={styles.iconButton} onClick={onCancel} aria-label="Fechar">
          <X size={18} />
        </button>
      </div>

      {submitError && <Alert type="error">{submitError}</Alert>}

      {selected ? (
        <>
          <div className={styles.selected}>
            <span className={styles.avatar} aria-hidden="true">
              {getInitials(selected.nome)}
            </span>
            <div className={styles.personText}>
              <strong>{selected.nome}</strong>
              <span>{selected.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)} disabled={saving}>
              Trocar
            </Button>
          </div>
          <VinculoFields
            values={values}
            onChange={(change) => {
              setValues((prev) => ({ ...prev, ...change }));
              setErrors({});
            }}
            errors={errors}
            disabled={saving}
          />
          <div className={formStyles.formActions}>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" icon={Link2} loading={saving} loadingText="Vinculando...">
              Vincular
            </Button>
          </div>
        </>
      ) : (
        <>
          <SearchPicker
            label="Buscar responsável"
            placeholder="Nome ou e-mail do responsável"
            fetchItems={buscarResponsaveis}
            getTitle={(usuario) => usuario.nome}
            getSubtitle={(usuario) => usuario.email}
            getDisabledReason={(usuario) => (linkedIds.has(usuario.id) ? 'Já vinculado' : null)}
            onSelect={setSelected}
            emptyMessage="Nenhum responsável ativo encontrado."
          />
          <p className={styles.hint}>
            Não encontrou? Cadastre o responsável em <Link to="/usuarios/novo">Usuários → Novo usuário</Link> (perfil
            Responsável) e volte aqui.
          </p>
        </>
      )}
    </form>
  );
}

/** Edição inline de um vínculo existente. */
function EditVinculoForm({ alunoId, vinculo, onCancel, onSaved }) {
  const [values, setValues] = useState({
    parentesco: vinculo.parentesco,
    responsavelPrincipal: vinculo.responsavelPrincipal,
    autorizadoReceberComunicacoes: vinculo.autorizadoReceberComunicacoes,
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!values.parentesco.trim()) {
      setErrors({ parentesco: 'Informe o parentesco.' });
      return;
    }
    setSaving(true);
    try {
      await updateVinculo(alunoId, vinculo.id, { ...values, parentesco: values.parentesco.trim() });
      onSaved(`Vínculo de ${vinculo.responsavel.nome} atualizado.`);
    } catch (error) {
      setErrors(toFieldErrors(error));
      setSubmitError(getApiErrorMessage(error, 'Não foi possível atualizar o vínculo.'));
      setSaving(false);
    }
  }

  return (
    <form
      className={styles.inlineForm}
      onSubmit={handleSubmit}
      noValidate
      aria-label={`Editar vínculo de ${vinculo.responsavel.nome}`}
    >
      {submitError && <Alert type="error">{submitError}</Alert>}
      <VinculoFields
        values={values}
        onChange={(change) => {
          setValues((prev) => ({ ...prev, ...change }));
          setErrors({});
        }}
        errors={errors}
        disabled={saving}
      />
      <div className={formStyles.formActions}>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={saving} loadingText="Salvando...">
          Salvar vínculo
        </Button>
      </div>
    </form>
  );
}

export function AlunoResponsaveisSection({ alunoId, alunoNome, initialVinculos }) {
  const [vinculos, setVinculos] = useState(initialVinculos);
  const [mode, setMode] = useState(null); // null | 'add' | id do vínculo em edição
  const [feedback, setFeedback] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  async function refresh(successMessage) {
    setMode(null);
    try {
      setVinculos(await listVinculos(alunoId));
      if (successMessage) setFeedback({ type: 'success', message: successMessage });
    } catch (error) {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível atualizar a lista.') });
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeVinculo(alunoId, confirmRemove.id);
      await refresh(`Vínculo com ${confirmRemove.responsavel.nome} removido.`);
    } catch (error) {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível remover o vínculo.') });
    } finally {
      setRemoving(false);
      setConfirmRemove(null);
    }
  }

  function startMode(nextMode) {
    setMode(nextMode);
    setFeedback(null);
  }

  return (
    <section className={formStyles.card} aria-labelledby="responsaveis-title">
      <div className={formStyles.cardHeader}>
        <h3 id="responsaveis-title" className={formStyles.cardTitle}>
          Responsáveis
        </h3>
        {mode !== 'add' && (
          <Button size="sm" icon={UserPlus} onClick={() => startMode('add')}>
            Vincular responsável
          </Button>
        )}
      </div>

      <div className={styles.body}>
        {feedback && (
          <Alert type={feedback.type} onClose={() => setFeedback(null)}>
            {feedback.message}
          </Alert>
        )}

        {mode === 'add' && (
          <AddVinculoPanel
            alunoId={alunoId}
            vinculos={vinculos}
            onCancel={() => setMode(null)}
            onSaved={(message) => refresh(message)}
          />
        )}

        {vinculos.length === 0 && mode !== 'add' && (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nenhum responsável vinculado</p>
            <p className={formStyles.muted}>
              Sem responsável vinculado, a família não receberá os comunicados sobre este aluno.
            </p>
          </div>
        )}

        {vinculos.length > 0 && (
          <ul className={styles.list}>
            {vinculos.map((vinculo) => (
              <li key={vinculo.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.avatar} aria-hidden="true">
                    {getInitials(vinculo.responsavel.nome)}
                  </span>
                  <div className={styles.personText}>
                    <strong>{vinculo.responsavel.nome}</strong>
                    <span>
                      {vinculo.parentesco} · {vinculo.responsavel.email}
                      {vinculo.responsavel.telefone && ` · ${maskTelefone(vinculo.responsavel.telefone)}`}
                    </span>
                    <div className={styles.tags}>
                      {vinculo.responsavelPrincipal && <Badge tone="primary">Principal</Badge>}
                      {!vinculo.autorizadoReceberComunicacoes && <Badge tone="warning">Não recebe comunicações</Badge>}
                      {!vinculo.responsavel.ativo && <Badge tone="danger">Usuário inativo</Badge>}
                    </div>
                  </div>
                  {mode !== vinculo.id && (
                    <div className={styles.itemActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Pencil}
                        onClick={() => startMode(vinculo.id)}
                        aria-label={`Editar vínculo de ${vinculo.responsavel.nome}`}
                        title="Editar vínculo"
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        onClick={() => setConfirmRemove(vinculo)}
                        aria-label={`Remover vínculo de ${vinculo.responsavel.nome}`}
                        title="Remover vínculo"
                      />
                    </div>
                  )}
                </div>
                {mode === vinculo.id && (
                  <EditVinculoForm
                    alunoId={alunoId}
                    vinculo={vinculo}
                    onCancel={() => setMode(null)}
                    onSaved={(message) => refresh(message)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Remover vínculo?"
        confirmLabel="Remover"
        confirmVariant="danger"
        loading={removing}
        onCancel={() => setConfirmRemove(null)}
        onConfirm={handleRemove}
      >
        <p>
          <strong>{confirmRemove?.responsavel.nome}</strong> deixará de ser responsável por {alunoNome} e não
          receberá mais comunicações sobre este aluno. O cadastro do responsável não é apagado.
        </p>
      </ConfirmDialog>
    </section>
  );
}
