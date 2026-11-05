import { ArrowLeft, Check, Circle, KeyRound, Lock, Mail, Save, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert } from '../../components/Alert';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { PageHeader } from '../../components/PageHeader';
import { SelectField } from '../../components/SelectField';
import { TextField } from '../../components/TextField';
import { useEntityLoader } from '../../hooks/useEntityLoader';
import { getApiErrorMessage } from '../../services/api';
import { toFieldErrors } from '../../utils/apiErrors';
import {
  createUsuario,
  getUsuario,
  resetUsuarioSenha,
  updateUsuario,
} from '../../services/usuarioService';
import { maskCpf, maskTelefone, ROLE_OPTIONS, roleLabel } from '../../utils/formatters';
import styles from '../../styles/FormPage.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPO_OPTIONS = [{ value: '', label: 'Selecione o perfil' }, ...ROLE_OPTIONS];

// Mesma política do backend (validators/commonValidators.js), mostrada enquanto o usuário digita.
const PASSWORD_RULES = [
  { label: 'Pelo menos 8 caracteres', test: (value) => value.length >= 8 },
  { label: 'Pelo menos uma letra', test: (value) => /\p{L}/u.test(value) },
  { label: 'Pelo menos um número', test: (value) => /\d/.test(value) },
];

const digits = (value) => value.replace(/\D/g, '');

function PasswordRules({ value }) {
  return (
    <ul className={styles.rules} aria-label="Requisitos da senha">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li key={rule.label} className={ok ? styles.ruleOk : undefined}>
            {ok ? <Check size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
            {rule.label}
            <span className="visually-hidden">{ok ? ' (atendido)' : ' (pendente)'}</span>
          </li>
        );
      })}
    </ul>
  );
}

function validatePassword(senha, confirmacao) {
  const errors = {};
  if (!senha) errors.senha = 'Informe a senha.';
  else if (!PASSWORD_RULES.every((rule) => rule.test(senha))) errors.senha = 'A senha não atende aos requisitos.';
  if (senha && confirmacao !== senha) errors.confirmacao = 'As senhas não conferem.';
  return errors;
}

function validateForm(form, { isEdit, tipoUsuario }) {
  const errors = {};
  if (form.nome.trim().length < 2) errors.nome = 'Informe o nome (mínimo 2 caracteres).';
  if (!form.email.trim()) errors.email = 'Informe o e-mail.';
  else if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'Informe um e-mail válido.';

  if (!isEdit) {
    if (!form.tipoUsuario) errors.tipoUsuario = 'Selecione o perfil.';
    Object.assign(errors, validatePassword(form.senha, form.confirmacao));
  }

  if (tipoUsuario === 'RESPONSAVEL') {
    const telefone = digits(form.telefone);
    const cpf = digits(form.cpf);
    if (telefone && (telefone.length < 10 || telefone.length > 11)) errors.telefone = 'Telefone inválido. Informe DDD + número.';
    if (cpf && cpf.length !== 11) errors.cpf = 'O CPF deve ter 11 dígitos.';
  }
  return errors;
}

/** Bloco "Redefinir senha" (só na edição). */
function ResetPasswordCard({ usuario }) {
  const [form, setForm] = useState({ senha: '', confirmacao: '' });
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setFeedback(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validatePassword(form.senha, form.confirmacao);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    try {
      await resetUsuarioSenha(usuario.id, form.senha);
      setForm({ senha: '', confirmacao: '' });
      setFeedback({ type: 'success', message: 'Senha redefinida. Informe a nova senha ao usuário por um canal seguro.' });
    } catch (error) {
      setErrors(toFieldErrors(error));
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível redefinir a senha.') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="reset-title">
      <div className={styles.cardHeader}>
        <h3 id="reset-title" className={styles.cardTitle}>
          Redefinir senha
        </h3>
        <p className={styles.cardText}>Defina uma nova senha para {usuario.nome}. A senha atual deixa de funcionar.</p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {feedback && <Alert type={feedback.type}>{feedback.message}</Alert>}
        <div className={styles.grid}>
          <TextField
            label="Nova senha"
            name="senha"
            type="password"
            icon={Lock}
            autoComplete="new-password"
            value={form.senha}
            onChange={handleChange}
            error={errors.senha}
            disabled={saving}
          />
          <TextField
            label="Confirmar nova senha"
            name="confirmacao"
            type="password"
            icon={Lock}
            autoComplete="new-password"
            value={form.confirmacao}
            onChange={handleChange}
            error={errors.confirmacao}
            disabled={saving}
          />
        </div>
        <PasswordRules value={form.senha} />
        <div className={styles.formActions}>
          <Button type="submit" variant="secondary" icon={KeyRound} loading={saving} loadingText="Redefinindo...">
            Redefinir senha
          </Button>
        </div>
      </form>
    </section>
  );
}

const EMPTY_FORM = { nome: '', email: '', tipoUsuario: '', senha: '', confirmacao: '', telefone: '', cpf: '' };

export function UsuarioFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  // Edição: carrega o usuário e preenche o formulário.
  const loader = useEntityLoader(getUsuario, id, {
    onLoad: (usuario) =>
      setForm({
        ...EMPTY_FORM,
        nome: usuario.nome,
        email: usuario.email,
        tipoUsuario: usuario.tipoUsuario,
        telefone: maskTelefone(usuario.responsavel?.telefone ?? ''),
        cpf: maskCpf(usuario.responsavel?.cpf ?? ''),
      }),
    errorMessage: 'Não foi possível carregar o usuário.',
  });
  const original = loader.data;
  const loadState = isEdit ? loader.status : 'ready';
  const loadError = loader.errorMessage;

  const tipoUsuario = isEdit ? original?.tipoUsuario : form.tipoUsuario;
  const isResponsavel = tipoUsuario === 'RESPONSAVEL';
  const title = isEdit ? 'Editar usuário' : 'Novo usuário';
  const breadcrumbs = [
    { label: 'Dashboard', to: '/dashboard' },
    { label: 'Usuários', to: '/usuarios' },
    { label: title },
  ];

  function handleChange(event) {
    const { name } = event.target;
    let { value } = event.target;
    if (name === 'cpf') value = maskCpf(value);
    if (name === 'telefone') value = maskTelefone(value);
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setSubmitError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const validation = validateForm(form, { isEdit, tipoUsuario });
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    // Telefone/CPF só existem para responsáveis; vazio vira null (remove o dado).
    const responsavelData = isResponsavel
      ? { telefone: digits(form.telefone) || null, cpf: digits(form.cpf) || null }
      : {};
    const base = { nome: form.nome.trim(), email: form.email.trim(), ...responsavelData };

    setSaving(true);
    setSubmitError('');
    try {
      const saved = isEdit
        ? await updateUsuario(id, base)
        : await createUsuario({ ...base, tipoUsuario: form.tipoUsuario, senha: form.senha });

      navigate('/usuarios', {
        state: {
          flash: {
            type: 'success',
            message: isEdit ? `Dados de ${saved.nome} atualizados.` : `Usuário ${saved.nome} criado com sucesso.`,
          },
        },
      });
    } catch (error) {
      setErrors(toFieldErrors(error));
      setSubmitError(getApiErrorMessage(error, 'Não foi possível salvar o usuário.'));
      setSaving(false);
    }
  }

  if (loadState === 'loading') {
    return (
      <div className={styles.page}>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <p className={styles.muted}>Carregando dados do usuário...</p>
      </div>
    );
  }

  if (loadState === 'notfound' || loadState === 'error') {
    return (
      <div className={styles.page}>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <Alert type="error">
          {loadState === 'notfound' ? 'Usuário não encontrado. Ele pode ter sido removido.' : loadError}
        </Alert>
        <div className={styles.formActions}>
          {loadState === 'error' && (
            <Button variant="secondary" onClick={loader.reload}>
              Tentar novamente
            </Button>
          )}
          <Button to="/usuarios" icon={ArrowLeft}>
            Voltar para usuários
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={title}
        description={
          isEdit ? 'Atualize os dados de acesso e contato.' : 'Cadastre um administrador, professor ou responsável.'
        }
        breadcrumbs={breadcrumbs}
      />

      <section className={styles.card} aria-labelledby="dados-title">
        <div className={styles.cardHeader}>
          <h3 id="dados-title" className={styles.cardTitle}>
            Dados do usuário
          </h3>
          {isEdit && (
            <div className={styles.badges}>
              <Badge tone="primary">{roleLabel(original.tipoUsuario)}</Badge>
              <Badge tone={original.ativo ? 'success' : 'danger'}>{original.ativo ? 'Ativo' : 'Inativo'}</Badge>
            </div>
          )}
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {submitError && <Alert type="error">{submitError}</Alert>}

          <div className={styles.grid}>
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
            <TextField
              label="E-mail"
              name="email"
              type="email"
              icon={Mail}
              autoComplete="off"
              inputMode="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              disabled={saving}
              maxLength={255}
            />

            {isEdit ? (
              <TextField
                label="Perfil"
                name="perfil"
                value={roleLabel(original.tipoUsuario)}
                disabled
                hint="O perfil não pode ser alterado depois do cadastro."
              />
            ) : (
              <SelectField
                label="Perfil"
                name="tipoUsuario"
                options={TIPO_OPTIONS}
                value={form.tipoUsuario}
                onChange={handleChange}
                error={errors.tipoUsuario}
                disabled={saving}
              />
            )}
          </div>

          {isResponsavel && (
            <fieldset className={styles.fieldset}>
              <legend>Dados do responsável (opcionais)</legend>
              <div className={styles.grid}>
                <TextField
                  label="Telefone"
                  name="telefone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="(11) 99999-8888"
                  value={form.telefone}
                  onChange={handleChange}
                  error={errors.telefone}
                  disabled={saving}
                />
                <TextField
                  label="CPF"
                  name="cpf"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={handleChange}
                  error={errors.cpf}
                  disabled={saving}
                />
              </div>
            </fieldset>
          )}

          {!isEdit && (
            <fieldset className={styles.fieldset}>
              <legend>Senha de acesso</legend>
              <div className={styles.grid}>
                <TextField
                  label="Senha"
                  name="senha"
                  type="password"
                  icon={Lock}
                  autoComplete="new-password"
                  value={form.senha}
                  onChange={handleChange}
                  error={errors.senha}
                  disabled={saving}
                />
                <TextField
                  label="Confirmar senha"
                  name="confirmacao"
                  type="password"
                  icon={Lock}
                  autoComplete="new-password"
                  value={form.confirmacao}
                  onChange={handleChange}
                  error={errors.confirmacao}
                  disabled={saving}
                />
              </div>
              <PasswordRules value={form.senha} />
            </fieldset>
          )}

          <div className={styles.formActions}>
            <Button variant="secondary" to="/usuarios">
              Cancelar
            </Button>
            <Button type="submit" icon={Save} loading={saving} loadingText="Salvando...">
              {isEdit ? 'Salvar alterações' : 'Criar usuário'}
            </Button>
          </div>
        </form>
      </section>

      {isEdit && <ResetPasswordCard usuario={original} />}
    </div>
  );
}

/** Recria o formulário ao trocar de usuário (/usuarios/A/editar → /usuarios/B/editar). */
export function UsuarioFormRoute() {
  const { id } = useParams();
  return <UsuarioFormPage key={id ?? 'novo'} />;
}
