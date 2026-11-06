import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Content-Security-Policy do build de produção: o navegador só executa scripts do próprio site
 * e só conversa com a própria origem e com a API. Se alguém conseguir injetar HTML (XSS),
 * scripts de fora ou inline não rodam.
 * - Só no BUILD: no `vite dev` o React injeta um script inline (recarga a quente) que a CSP bloquearia.
 * - style-src 'unsafe-inline': a interface usa `style={{ width }}` (barras de progresso).
 * - Via <meta> não dá para usar frame-ancestors: na hospedagem, enviar também o cabeçalho
 *   (ver SECURITY.md).
 */
function contentSecurityPolicy(apiUrl) {
  // API relativa ("/api", site e API no mesmo endereço) já está coberta por 'self'.
  const apiOrigin = apiUrl.startsWith('/') ? '' : new URL(apiUrl).origin;
  const politica = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  return {
    name: 'escolaavis-csp',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: politica }, injectTo: 'head-prepend' },
    ],
  };
}

export default defineConfig(({ mode }) => {
  // .env da pasta do frontend (onde está este arquivo), não da pasta de onde o comando rodou.
  const env = loadEnv(mode, import.meta.dirname, 'VITE_');
  // Mesmo padrão do services/api.js quando VITE_API_URL não está definida.
  const apiUrl = env.VITE_API_URL || 'http://localhost:3333/api';

  return {
    plugins: [react(), contentSecurityPolicy(apiUrl)],
    server: {
      port: 5173,
      // Porta fixa: precisa bater com FRONTEND_URL (CORS) do backend.
      strictPort: true,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    // Vitest (npm test): DOM simulado com jsdom; setup registra os matchers do jest-dom.
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },
  };
});
