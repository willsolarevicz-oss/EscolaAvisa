import { Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from './Button';
import styles from '../styles/ListPage.module.css';

/**
 * Botões de uma linha de listagem: editar + desativar (ou reativar).
 * `toggle` vem de useAtivoToggle. `canDeactivate=false` esconde o desativar (ex.: o próprio admin).
 */
export function RowActions({ item, label, editTo, toggle, canDeactivate = true }) {
  return (
    <div className={styles.rowActions}>
      <Button
        variant="secondary"
        size="sm"
        icon={Pencil}
        to={editTo}
        aria-label={`Editar ${label}`}
        title="Editar"
      />
      {item.ativo ? (
        canDeactivate && (
          <Button
            variant="danger"
            size="sm"
            icon={ToggleRight}
            onClick={() => toggle.askToDeactivate(item)}
            disabled={toggle.busy}
            aria-label={`Desativar ${label}`}
            title="Desativar"
          />
        )
      ) : (
        <Button
          variant="secondary"
          size="sm"
          icon={ToggleLeft}
          onClick={() => toggle.activate(item)}
          loading={toggle.togglingId === item.id}
          disabled={toggle.busy}
          aria-label={`Reativar ${label}`}
          title="Reativar"
        />
      )}
    </div>
  );
}
