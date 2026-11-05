import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as eventoController from '../controllers/eventoController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { calendarioQuerySchema, eventoSchema } from '../validators/eventoValidators.js';

/** GET /api/calendario?mes=AAAA-MM — todos os perfis (cada um vê o que lhe diz respeito). */
export const calendarioRoutes = Router();
calendarioRoutes.get('/', authenticate, validateQuery(calendarioQuerySchema), eventoController.calendario);

/** /api/eventos — quem cria e mantém o calendário (professor: só os próprios, ver service). */
export const eventoRoutes = Router();
eventoRoutes.use(authenticate, authorize(ROLES.ADMIN, ROLES.PROFESSOR));

eventoRoutes.post('/', validateBody(eventoSchema), eventoController.create);
eventoRoutes.get('/:id', eventoController.getById);
eventoRoutes.put('/:id', validateBody(eventoSchema), eventoController.update);
eventoRoutes.delete('/:id', eventoController.remove);
