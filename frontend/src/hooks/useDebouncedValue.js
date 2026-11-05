import { useEffect, useState } from 'react';

/** Devolve `value` só depois de `delay` ms sem mudanças (ex.: busca enquanto digita). */
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
