// Carregado antes de cada arquivo de teste (vite.config.js → test.setupFiles).
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Desmonta o que cada teste renderizou e limpa a sessionStorage (filtros lembrados).
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});
