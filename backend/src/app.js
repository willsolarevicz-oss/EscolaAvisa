import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { apiRoutes } from './routes/index.js';

/** Cria o app Express sem abrir porta (o server.js faz o listen; os testes usam direto). */
export function createApp() {
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

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
