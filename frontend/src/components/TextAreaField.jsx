import { useId } from 'react';
import styles from './TextField.module.css';

/** Campo de texto longo com o mesmo visual do TextField (label, erro, dica e contador). */
export function TextAreaField({ label, error, hint, id, value = '', maxLength, ...textareaProps }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.control} ${styles.textareaControl} ${error ? styles.invalid : ''}`}>
        <textarea
          id={inputId}
          className={`${styles.input} ${styles.textarea}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          value={value}
          maxLength={maxLength}
          {...textareaProps}
        />
      </div>
      <div className={styles.footer}>
        {error ? (
          <p id={errorId} className={styles.error}>
            {error}
          </p>
        ) : (
          hint && (
            <p id={hintId} className={styles.hint}>
              {hint}
            </p>
          )
        )}
        {maxLength && (
          <span className={styles.counter} aria-hidden="true">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
