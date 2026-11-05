import { useId } from 'react';
import styles from './TextField.module.css';

/**
 * Campo de texto com label, ícone opcional, mensagem de erro, dica e slot à direita.
 * `hideLabel` mantém o label só para leitores de tela (ex.: campo de busca).
 */
export function TextField({ label, icon: Icon, error, hint, endAdornment, id, hideLabel = false, ...inputProps }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={hideLabel ? 'visually-hidden' : styles.label}>
        {label}
      </label>
      <div className={`${styles.control} ${error ? styles.invalid : ''}`}>
        {Icon && <Icon size={18} className={styles.icon} aria-hidden="true" />}
        <input
          id={inputId}
          className={styles.input}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...inputProps}
        />
        {endAdornment}
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}
