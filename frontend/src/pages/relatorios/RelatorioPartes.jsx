import listStyles from '../../styles/ListPage.module.css';
import styles from '../../styles/Relatorios.module.css';

/** Número de resumo (o número é o "gráfico"). */
export function StatTile({ label, value, hint }) {
  return (
    <div className={styles.tile}>
      <p className={styles.tileLabel}>{label}</p>
      <p className={styles.tileValue}>{value}</p>
      {hint && <p className={styles.tileHint}>{hint}</p>}
    </div>
  );
}

/** Card com título; `vazio` aparece no lugar do conteúdo quando não há dados. */
export function Secao({ titulo, nota, vazio, children }) {
  return (
    <section className={listStyles.card}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{titulo}</h3>
        {nota && <span className={styles.sectionNote}>{nota}</span>}
      </div>
      {vazio ? <p className={styles.empty}>{vazio}</p> : children}
    </section>
  );
}

/**
 * Barras horizontais de UMA série (ex.: ocorrências por tipo): uma cor só, comprimento
 * proporcional ao maior valor, valor escrito ao lado (nunca só no tooltip).
 * itens: [{ key, label, value }]
 */
export function BarList({ itens, descricao }) {
  const maior = Math.max(...itens.map((i) => i.value), 1);
  return (
    <ul className={styles.bars} aria-label={descricao}>
      {itens.map((item) => (
        <li key={item.key} className={styles.barRow} title={`${item.label}: ${item.value}`}>
          <span>{item.label}</span>
          <span className={styles.barTrack} aria-hidden="true">
            <span className={styles.barFill} style={{ width: `${(item.value / maior) * 100}%` }} />
          </span>
          <span className={styles.barValue}>{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
