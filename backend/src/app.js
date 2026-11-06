import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { auditoria } from './middlewares/auditoria.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { apiRateLimiter } from './middlewares/rateLimiters.js';
import { apiRoutes } from './routes/index.js';

/**
 * Entrega o frontend compilado (SPA): arquivos que existem saem da pasta; qualquer outra rota
 * GET fora de /api devolve o index.html para o React Router decidir a tela.
 */
function frontendEstatico(app, pasta) {
  app.use(express.static(pasta, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    // `root` em vez do caminho absoluto: a regra que barra pastas ocultas (".algo") vale só para
    // o nome do arquivo, não para onde o projeto está instalado.
    res.sendFile('index.html', { root: pasta }, (error) => error && next(error));
  });
}

/**
 * Cria o app Express sem abrir porta (o server.js faz o listen; os testes usam direto).
 * `frontendDistDir`: se informado, também entrega o site (ver FRONTEND_DIST_DIR no .env.example).
 */
export function createApp({ frontendDistDir = env.frontendDistDir } = {}) {
  const app = express();

  app.disable('x-powered-by');
  // Define de onde vem req.ip (usado como chave do rate limit). Ver TRUST_PROXY no .env.example.
  app.set('trust proxy', env.trustProxy);
  app.use(helmet());
  app.use(
    cors({
      origin: env.frontendUrls,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  // Limite baixo: a API só recebe JSON pequeno (uploads, se houver, terão rota própria).
  app.use(express.json({ limit: '100kb' }));

  // Auditoria primeiro (registra até as requisições barradas pelo limite, que são sinal de ataque);
  // depois o limite geral por IP (o login tem um limite próprio, mais rígido).
  app.use('/api', auditoria, apiRateLimiter, apiRoutes);

  if (frontendDistDir) frontendEstatico(app, frontendDistDir);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
