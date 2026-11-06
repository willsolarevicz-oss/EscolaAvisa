import { Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from './Button';
import styles from '../styles/ListPage.module.css';

/**
 * Botões de uma linha de listagem: editar (ou "ver") + desativar (ou reativar).
 * `toggle` vem de useAtivoToggle. `canDeactivate=false` esconde o desativar (ex.: o próprio admin);
 * `canReactivate=false` esconde o reativar (ex.: usuário anonimizado, que não volta).
 * `editAction` troca o rótulo/ícone do primeiro botão (ex.: { label: 'Ver', icon: Eye });
 * `deactivateLabel` troca o verbo de desativar (ex.: "Arquivar" para avisos).
 */
export function RowActions({
  item,
  label,
  editTo,
  toggle,
  canDeactivate = true,
  canReactivate = true,
  editAction = { label: 'Editar', icon: Pencil },
  deactivateLabel = 'Desativar',
}) {
  return (
    <div className={styles.rowActions}>
      <Button
        variant="secondary"
        size="sm"
        icon={editAction.icon}
        to={editTo}
        aria-label={`${editAction.label} ${label}`}
        title={editAction.label}
      />
      {item.ativo ? (
        canDeactivate && (
          <Button
            variant="danger"
            size="sm"
            icon={ToggleRight}
            onClick={() => toggle.askToDeactivate(item)}
            disabled={toggle.busy}
            aria-label={`${deactivateLabel} ${label}`}
            title={deactivateLabel}
          />
        )
      ) : (
        canReactivate && (
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
        )
      )}
    </div>
  );
}
