import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as notaController from '../controllers/notaController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateBody } from '../middlewares/validate.js';
import { lancamentoSchema } from '../validators/notaValidators.js';

export const notaRoutes = Router();

// Lançamento: administração e professores (professor só nas suas turmas/disciplinas — ver service).
notaRoutes.use(authenticate, authorize(ROLES.ADMIN, ROLES.PROFESSOR));

notaRoutes.get('/turmas', notaController.listTurmas);
notaRoutes.get('/turmas/:turmaId/disciplinas/:disciplinaId', notaController.getGrade);
notaRoutes.put('/turmas/:turmaId/disciplinas/:disciplinaId', validateBody(lancamentoSchema), notaController.lancar);
