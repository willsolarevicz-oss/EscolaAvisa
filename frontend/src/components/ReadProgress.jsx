import styles from './ReadProgress.module.css';

/** Barra "X de Y leram" do controle de visualização de avisos. */
export function ReadProgress({ lidos, total, compact = false }) {
  const percent = total > 0 ? Math.round((lidos / total) * 100) : 0;
  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={lidos}
        aria-label={`${lidos} de ${total} responsáveis leram`}
      >
        <span className={`${styles.bar} ${percent === 100 ? styles.done : ''}`} style={{ width: `${percent}%` }} />
      </div>
      <span className={styles.text}>
        {lidos} de {total} {total === 1 ? 'leu' : 'leram'}
      </span>
    </div>
  );
}
