import { useId } from 'react';
import styles from './TextField.module.css';

/** Campo de texto com label, ícone opcional, mensagem de erro e slot à direita. */
export function TextField({ label, icon: Icon, error, endAdornment, id, ...inputProps }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.control} ${error ? styles.invalid : ''}`}>
        {Icon && <Icon size={18} className={styles.icon} aria-hidden="true" />}
        <input
          id={inputId}
          className={styles.input}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        {endAdornment}
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
