import { LoaderCircle } from 'lucide-react';
import { Link } from 'react-router';
import styles from './Button.module.css';

/**
 * Botão padrão. Com `loading`, fica desabilitado e mostra um spinner
 * (evita clique duplo durante requisições).
 * Com `to`, renderiza um link de navegação com a mesma aparência.
 * variant: primary | secondary | ghost | danger
 */
export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  loadingText,
  icon: Icon,
  children,
  disabled,
  type = 'button',
  to,
  className = '',
  ...props
}) {
  const classes = [styles.button, styles[variant], styles[size], fullWidth && styles.fullWidth, className]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {Icon && <Icon size={18} aria-hidden="true" />}
        {children && <span>{children}</span>}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading ? (
        <LoaderCircle className="spin" size={18} aria-hidden="true" />
      ) : (
        Icon && <Icon size={18} aria-hidden="true" />
      )}
      {(children || (loading && loadingText)) && <span>{loading && loadingText ? loadingText : children}</span>}
    </button>
  );
}
