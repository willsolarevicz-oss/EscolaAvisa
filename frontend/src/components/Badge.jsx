import styles from './Badge.module.css';

/** Etiqueta de status. tone: primary | success | warning | danger | neutral */
export function Badge({ tone = 'neutral', children }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}
