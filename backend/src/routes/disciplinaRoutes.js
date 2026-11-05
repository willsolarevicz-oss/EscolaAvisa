import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as disciplinaController from '../controllers/disciplinaController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { disciplinaSchema, listDisciplinasQuerySchema, setAtivoSchema } from '../validators/disciplinaValidators.js';

export const disciplinaRoutes = Router();

disciplinaRoutes.use(authenticate, authorize(ROLES.ADMIN));

disciplinaRoutes.get('/', validateQuery(listDisciplinasQuerySchema), disciplinaController.list);
disciplinaRoutes.post('/', validateBody(disciplinaSchema), disciplinaController.create);
disciplinaRoutes.get('/:id', disciplinaController.getById);
disciplinaRoutes.put('/:id', validateBody(disciplinaSchema), disciplinaController.update);
disciplinaRoutes.patch('/:id/ativo', validateBody(setAtivoSchema), disciplinaController.setAtivo);
