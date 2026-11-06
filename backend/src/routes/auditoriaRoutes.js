import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as auditoriaController from '../controllers/auditoriaController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateQuery } from '../middlewares/validate.js';
import { listAuditoriaQuerySchema } from '../validators/auditoriaValidators.js';

/** GET /api/auditoria — trilha de quem alterou o quê. Só ADMIN. */
export const auditoriaRoutes = Router();
auditoriaRoutes.use(authenticate, authorize(ROLES.ADMIN));

auditoriaRoutes.get('/', validateQuery(listAuditoriaQuerySchema), auditoriaController.list);
