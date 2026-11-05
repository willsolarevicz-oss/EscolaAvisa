import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import styles from './Pagination.module.css';

/** Rodapé de paginação: "Mostrando 21–40 de 57" + anterior/próxima. */
export function Pagination({ page, pageSize, total, totalPages, onPageChange, disabled = false }) {
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav className={styles.pagination} aria-label="Paginação">
      <p className={styles.summary}>
        {first <= total ? (
          <>
            Mostrando <strong>{first}</strong>–<strong>{last}</strong> de <strong>{total}</strong>
          </>
        ) : (
          <>Página sem resultados</>
        )}
      </p>
      <div className={styles.controls}>
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronLeft}
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Página anterior"
        />
        <span className={styles.current}>
          Página {page} de {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          icon={ChevronRight}
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          aria-label="Próxima página"
        />
      </div>
    </nav>
  );
}
