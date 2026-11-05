import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as ocorrenciaController from '../controllers/ocorrenciaController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import {
  listOcorrenciasQuerySchema,
  ocorrenciaSchema,
  setAtivoSchema,
} from '../validators/ocorrenciaValidators.js';

export const ocorrenciaRoutes = Router();

// Quem registra: administração e professores (professor só as próprias — ver service).
ocorrenciaRoutes.use(authenticate, authorize(ROLES.ADMIN, ROLES.PROFESSOR));

ocorrenciaRoutes.get('/', validateQuery(listOcorrenciasQuerySchema), ocorrenciaController.list);
ocorrenciaRoutes.post('/', validateBody(ocorrenciaSchema), ocorrenciaController.create);
ocorrenciaRoutes.get('/:id', ocorrenciaController.getById);
ocorrenciaRoutes.patch('/:id/ativo', validateBody(setAtivoSchema), ocorrenciaController.setAtivo);
