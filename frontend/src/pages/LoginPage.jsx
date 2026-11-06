import { Bell, Eye, EyeOff, Lock, LogIn, Mail, MessagesSquare, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Alert } from '../components/Alert';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { TextField } from '../components/TextField';
import { INSTITUICAO } from '../config/instituicao';
import { useAuth } from '../hooks/useAuth';
import { getApiErrorMessage } from '../services/api';
import styles from './LoginPage.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HIGHLIGHTS = [
  { icon: Bell, title: 'Avisos e comunicados', text: 'Informações da escola chegando a quem precisa.' },
  { icon: MessagesSquare, title: 'Comunicação direta', text: 'Escola, professores e responsáveis no mesmo lugar.' },
  { icon: ShieldCheck, title: 'Acesso seguro', text: 'Cada perfil vê apenas o que lhe diz respeito.' },
];

function validate({ email, senha }) {
  const errors = {};
  if (!email.trim()) errors.email = 'Informe o e-mail.';
  else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Informe um e-mail válido.';
  if (!senha) errors.senha = 'Informe a senha.';
  return errors;
}

export function LoginPage() {
  const { login, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', senha: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    if (submitError) setSubmitError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const errors = validate(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError('');
    clearNotice();
    try {
      await login(form.email.trim(), form.senha);
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Não foi possível entrar. Tente novamente.'));
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel}>
        <Logo variant="light" size="lg" />
        <div className={styles.brandContent}>
          <h1 className={styles.brandTitle}>A comunicação entre escola e família, organizada.</h1>
          <p className={styles.brandText}>
            Avisos, ocorrências, notas e mensagens em um só lugar, com acesso para administração, professores e
            responsáveis.
          </p>
          <ul className={styles.highlights}>
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className={styles.highlight}>
                <span className={styles.highlightIcon} aria-hidden="true">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.brandFooter}>© {new Date().getFullYear()} EscolaAvis</p>
      </aside>

      <main className={styles.formPanel}>
        <div className={styles.formWrapper}>
          <div className={styles.mobileLogo}>
            <Logo size="lg" />
          </div>

          <header className={styles.formHeader}>
            <h2 className={styles.formTitle}>Entrar</h2>
            <p className={styles.formSubtitle}>Acesse sua conta com o e-mail e a senha cadastrados.</p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {notice && !submitError && <Alert type={notice.type}>{notice.message}</Alert>}
            {submitError && <Alert type="error">{submitError}</Alert>}

            <TextField
              label="E-mail"
              name="email"
              type="email"
              icon={Mail}
              placeholder="seu.email@escola.com"
              autoComplete="email"
              inputMode="email"
              autoFocus
              value={form.email}
              onChange={handleChange}
              error={fieldErrors.email}
              disabled={submitting}
            />

            <TextField
              label="Senha"
              name="senha"
              type={showPassword ? 'text' : 'password'}
              icon={Lock}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              value={form.senha}
              onChange={handleChange}
              error={fieldErrors.senha}
              disabled={submitting}
              endAdornment={
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            <Button type="submit" fullWidth loading={submitting} loadingText="Entrando..." icon={LogIn}>
              Entrar
            </Button>
          </form>

          <p className={styles.help}>Problemas para acessar? Procure a secretaria da escola.</p>
          {/* Identificação do fornecedor e documentos, acessíveis antes do login. */}
          <p className={styles.help}>
            {INSTITUICAO.nome} · <Link to="/privacidade">Privacidade</Link> · <Link to="/termos">Termos de Uso</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
