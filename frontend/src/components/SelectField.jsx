import { ChevronDown } from 'lucide-react';
import { useId } from 'react';
import styles from './TextField.module.css';

/** Select com o mesmo visual do TextField. options: [{ value, label }] */
export function SelectField({ label, options, error, id, hideLabel = false, ...selectProps }) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={selectId} className={hideLabel ? 'visually-hidden' : styles.label}>
        {label}
      </label>
      <div className={`${styles.control} ${error ? styles.invalid : ''}`}>
        <select
          id={selectId}
          className={`${styles.input} ${styles.select}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          {...selectProps}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className={styles.icon} aria-hidden="true" />
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
