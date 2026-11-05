import { useId } from 'react';
import styles from './CheckboxField.module.css';

/** Checkbox com rótulo e descrição opcional. */
export function CheckboxField({ label, description, id, ...inputProps }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = `${inputId}-description`;

  return (
    <div className={styles.field}>
      <input
        id={inputId}
        type="checkbox"
        className={styles.input}
        aria-describedby={description ? descriptionId : undefined}
        {...inputProps}
      />
      <div>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        {description && (
          <p id={descriptionId} className={styles.description}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
