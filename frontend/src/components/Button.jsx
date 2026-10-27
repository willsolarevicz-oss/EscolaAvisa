import { LoaderCircle } from 'lucide-react';
import styles from './Button.module.css';

/**
 * Botão padrão. Com `loading`, fica desabilitado e mostra um spinner
 * (evita clique duplo durante requisições).
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
  className = '',
  ...props
}) {
  const classes = [styles.button, styles[variant], styles[size], fullWidth && styles.fullWidth, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading ? (
        <LoaderCircle className="spin" size={18} aria-hidden="true" />
      ) : (
        Icon && <Icon size={18} aria-hidden="true" />
      )}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
}
