import { useEffect, useId, useRef } from 'react';
import { Button } from './Button';
import styles from './ConfirmDialog.module.css';

/**
 * Diálogo de confirmação com <dialog> nativo: o navegador já cuida do foco,
 * da tecla Esc e de bloquear o resto da página enquanto está aberto.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirmar',
  confirmVariant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  // Id único: pode haver mais de um diálogo na mesma página.
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      // Esc dispara "cancel": avisamos o pai em vez de deixar o <dialog> fechar sozinho.
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) onCancel();
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <div className={styles.body}>{children}</div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
