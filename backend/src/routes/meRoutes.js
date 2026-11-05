import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as avisoController from '../controllers/avisoController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateQuery } from '../middlewares/validate.js';
import { meusAvisosQuerySchema } from '../validators/avisoValidators.js';

/** Rotas "do próprio usuário": os dados vêm sempre de req.user, nunca de um id na URL. */
export const meRoutes = Router();

meRoutes.use(authenticate);

const responsavel = authorize(ROLES.RESPONSAVEL);
meRoutes.get('/avisos', responsavel, validateQuery(meusAvisosQuerySchema), avisoController.listMeus);
meRoutes.get('/avisos/:id', responsavel, avisoController.getMeu);
meRoutes.post('/avisos/:id/visualizar', responsavel, avisoController.marcarLido);

meRoutes.get('/turmas', authorize(ROLES.PROFESSOR), avisoController.minhasTurmas);
