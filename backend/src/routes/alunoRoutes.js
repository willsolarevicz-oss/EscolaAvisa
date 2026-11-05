import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as alunoController from '../controllers/alunoController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import {
  alunoSchema,
  createVinculoSchema,
  listAlunosQuerySchema,
  setAtivoSchema,
  updateVinculoSchema,
} from '../validators/alunoValidators.js';

export const alunoRoutes = Router();

// Cadastro de alunos e vínculos é exclusivo da administração nesta fase.
alunoRoutes.use(authenticate, authorize(ROLES.ADMIN));

alunoRoutes.get('/', validateQuery(listAlunosQuerySchema), alunoController.list);
alunoRoutes.post('/', validateBody(alunoSchema), alunoController.create);
alunoRoutes.get('/:id', alunoController.getById);
alunoRoutes.put('/:id', validateBody(alunoSchema), alunoController.update);
alunoRoutes.patch('/:id/ativo', validateBody(setAtivoSchema), alunoController.setAtivo);

alunoRoutes.get('/:id/responsaveis', alunoController.listVinculos);
alunoRoutes.post('/:id/responsaveis', validateBody(createVinculoSchema), alunoController.createVinculo);
alunoRoutes.put('/:id/responsaveis/:vinculoId', validateBody(updateVinculoSchema), alunoController.updateVinculo);
alunoRoutes.delete('/:id/responsaveis/:vinculoId', alunoController.removeVinculo);
