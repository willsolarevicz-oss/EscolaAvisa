import axios from 'axios';
import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { getApiErrorMessage } from '../services/api';
import { Alert } from './Alert';
import { Badge } from './Badge';
import { Button } from './Button';
import { TextField } from './TextField';
import styles from './SearchPicker.module.css';

/**
 * Busca com lista de resultados para escolher um item (ex.: responsável, aluno, professor).
 * - fetchItems(busca, { signal }) → Promise<item[]>
 * - getTitle / getSubtitle: texto de cada resultado
 * - getDisabledReason(item) → texto (ex.: "Já vinculado") ou null se o item pode ser escolhido
 */
export function SearchPicker({
  label,
  placeholder,
  fetchItems,
  getTitle,
  getSubtitle,
  getDisabledReason = () => null,
  onSelect,
  selectLabel = 'Selecionar',
  emptyMessage = 'Nenhum resultado encontrado.',
  disabled = false,
}) {
  const [busca, setBusca] = useState('');
  const debouncedBusca = useDebouncedValue(busca.trim());
  const [result, setResult] = useState({ key: null, items: [], error: null });

  // A função costuma ser criada a cada render pelo pai; guardamos a mais recente
  // para a busca rodar só quando o texto muda (e não a cada render).
  const fetchRef = useRef(fetchItems);
  useEffect(() => {
    fetchRef.current = fetchItems;
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchRef.current(debouncedBusca || undefined, { signal: controller.signal })
      .then((items) => setResult({ key: debouncedBusca, items, error: null }))
      .catch((error) => {
        if (axios.isCancel(error)) return;
        setResult({ key: debouncedBusca, items: [], error: getApiErrorMessage(error, 'Não foi possível buscar.') });
      });
    return () => controller.abort();
  }, [debouncedBusca]);

  const searching = result.key !== debouncedBusca;

  return (
    <div className={styles.picker}>
      <TextField
        label={label}
        icon={Search}
        type="search"
        placeholder={placeholder}
        value={busca}
        onChange={(event) => setBusca(event.target.value)}
        autoFocus
        maxLength={100}
        disabled={disabled}
      />
      {result.error && <Alert type="error">{result.error}</Alert>}
      <ul className={`${styles.results} ${searching ? styles.loading : ''}`} aria-busy={searching} aria-label="Resultados">
        {result.items.map((item) => {
          const disabledReason = getDisabledReason(item);
          return (
            <li key={item.id} className={styles.result}>
              <div className={styles.text}>
                <strong>{getTitle(item)}</strong>
                {getSubtitle && <span>{getSubtitle(item)}</span>}
              </div>
              {disabledReason ? (
                <Badge tone="neutral">{disabledReason}</Badge>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => onSelect(item)} disabled={disabled}>
                  {selectLabel}
                </Button>
              )}
            </li>
          );
        })}
        {!searching && !result.error && result.items.length === 0 && <li className={styles.empty}>{emptyMessage}</li>}
      </ul>
    </div>
  );
}
