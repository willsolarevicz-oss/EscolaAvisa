import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as responsavelController from '../controllers/responsavelController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateQuery } from '../middlewares/validate.js';
import { listResponsaveisQuerySchema } from '../validators/responsavelValidators.js';

/** /api/responsaveis — consulta da administração (cadastro em /usuarios, vínculos em /alunos). */
export const responsavelRoutes = Router();
responsavelRoutes.use(authenticate, authorize(ROLES.ADMIN));

responsavelRoutes.get('/', validateQuery(listResponsaveisQuerySchema), responsavelController.list);
// Alunos ativos sem responsável que receba comunicações (alerta da tela).
responsavelRoutes.get('/pendencias', responsavelController.pendencias);
