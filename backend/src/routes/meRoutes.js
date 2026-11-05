import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as avisoController from '../controllers/avisoController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateQuery } from '../middlewares/validate.js';
import * as notaController from '../controllers/notaController.js';
import * as ocorrenciaController from '../controllers/ocorrenciaController.js';
import { meusAvisosQuerySchema } from '../validators/avisoValidators.js';
import { meusAlunosQuerySchema, minhasOcorrenciasQuerySchema } from '../validators/ocorrenciaValidators.js';

/** Rotas "do próprio usuário": os dados vêm sempre de req.user, nunca de um id na URL. */
export const meRoutes = Router();

meRoutes.use(authenticate);

const responsavel = authorize(ROLES.RESPONSAVEL);
meRoutes.get('/avisos', responsavel, validateQuery(meusAvisosQuerySchema), avisoController.listMeus);
meRoutes.get('/avisos/:id', responsavel, avisoController.getMeu);
meRoutes.post('/avisos/:id/visualizar', responsavel, avisoController.marcarLido);

meRoutes.get(
  '/ocorrencias',
  responsavel,
  validateQuery(minhasOcorrenciasQuerySchema),
  ocorrenciaController.listMinhas,
);
meRoutes.get('/ocorrencias/:id', responsavel, ocorrenciaController.getMinha);
meRoutes.post('/ocorrencias/:id/ciencia', responsavel, ocorrenciaController.registrarCiencia);
meRoutes.get('/boletim', responsavel, notaController.boletim);

const professor = authorize(ROLES.PROFESSOR);
meRoutes.get('/turmas', professor, avisoController.minhasTurmas);
meRoutes.get('/alunos', professor, validateQuery(meusAlunosQuerySchema), ocorrenciaController.meusAlunos);
