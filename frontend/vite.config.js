import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Porta fixa: precisa bater com FRONTEND_URL (CORS) do backend.
    strictPort: true,
  },
  preview: {
    port: 4173,
  },
});
