import { useState } from 'react';
import { getApiErrorMessage } from '../services/api';

/**
 * Ativar/desativar um item de listagem, com confirmação antes de desativar.
 * - setAtivo(id, ativo): chamada à API
 * - successMessage(item, novoAtivo): texto exibido após sucesso
 * - onDone({ type, message }): ex.: mostrar mensagem e recarregar a lista
 */
export function useAtivoToggle({ setAtivo, successMessage, onDone }) {
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  async function changeAtivo(item, novoAtivo) {
    setTogglingId(item.id);
    try {
      await setAtivo(item.id, novoAtivo);
      onDone({ type: 'success', message: successMessage(item, novoAtivo) });
    } catch (error) {
      onDone({ type: 'error', message: getApiErrorMessage(error, 'Não foi possível alterar a situação.') });
    } finally {
      setTogglingId(null);
      setConfirmTarget(null);
    }
  }

  return {
    confirmTarget,
    togglingId,
    busy: togglingId !== null,
    askToDeactivate: setConfirmTarget,
    cancelDeactivate: () => setConfirmTarget(null),
    confirmDeactivate: () => changeAtivo(confirmTarget, false),
    activate: (item) => changeAtivo(item, true),
  };
}
