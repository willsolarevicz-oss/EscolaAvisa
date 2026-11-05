import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as avisoController from '../controllers/avisoController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { avisoSchema, listAvisosQuerySchema, setAtivoSchema } from '../validators/avisoValidators.js';

export const avisoRoutes = Router();

// Quem publica: administração e professores (professor só vê os próprios avisos — ver service).
avisoRoutes.use(authenticate, authorize(ROLES.ADMIN, ROLES.PROFESSOR));

avisoRoutes.get('/', validateQuery(listAvisosQuerySchema), avisoController.list);
avisoRoutes.post('/', validateBody(avisoSchema), avisoController.create);
avisoRoutes.get('/:id', avisoController.getById);
avisoRoutes.patch('/:id/ativo', validateBody(setAtivoSchema), avisoController.setAtivo);
