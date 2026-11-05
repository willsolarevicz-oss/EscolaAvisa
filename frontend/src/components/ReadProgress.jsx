import styles from './ReadProgress.module.css';

const LEITURA = { um: 'leu', varios: 'leram' };

/**
 * Barra "X de Y leram" do controle de visualização (avisos) ou de ciência (ocorrências).
 * `verbo`: { um, varios } — ex.: { um: 'deu ciência', varios: 'deram ciência' }.
 */
export function ReadProgress({ lidos, total, compact = false, verbo = LEITURA }) {
  const percent = total > 0 ? Math.round((lidos / total) * 100) : 0;
  const texto = `${lidos} de ${total} ${total === 1 ? verbo.um : verbo.varios}`;
  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={lidos}
        aria-label={texto}
      >
        <span className={`${styles.bar} ${percent === 100 ? styles.done : ''}`} style={{ width: `${percent}%` }} />
      </div>
      <span className={styles.text}>{texto}</span>
    </div>
  );
}
