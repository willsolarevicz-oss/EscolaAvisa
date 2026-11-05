import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as relatorioController from '../controllers/relatorioController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateQuery } from '../middlewares/validate.js';
import { notasQuerySchema, periodoQuerySchema } from '../validators/relatorioValidators.js';

/** /api/relatorios — ADMIN vê a escola toda; PROFESSOR só o que é dele (regras no service). */
export const relatorioRoutes = Router();
relatorioRoutes.use(authenticate, authorize(ROLES.ADMIN, ROLES.PROFESSOR));

relatorioRoutes.get('/avisos', validateQuery(periodoQuerySchema), relatorioController.avisos);
relatorioRoutes.get('/ocorrencias', validateQuery(periodoQuerySchema), relatorioController.ocorrencias);
relatorioRoutes.get('/notas', validateQuery(notasQuerySchema), relatorioController.notas);
