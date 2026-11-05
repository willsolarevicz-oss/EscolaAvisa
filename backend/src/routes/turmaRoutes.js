import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as turmaController from '../controllers/turmaController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import {
  atribuicaoSchema,
  listTurmasQuerySchema,
  matriculaSchema,
  setAtivoSchema,
  turmaSchema,
} from '../validators/turmaValidators.js';

export const turmaRoutes = Router();

turmaRoutes.use(authenticate, authorize(ROLES.ADMIN));

turmaRoutes.get('/', validateQuery(listTurmasQuerySchema), turmaController.list);
turmaRoutes.post('/', validateBody(turmaSchema), turmaController.create);
turmaRoutes.get('/:id', turmaController.getById);
turmaRoutes.put('/:id', validateBody(turmaSchema), turmaController.update);
turmaRoutes.patch('/:id/ativo', validateBody(setAtivoSchema), turmaController.setAtivo);

turmaRoutes.get('/:id/alunos', turmaController.listAlunos);
turmaRoutes.post('/:id/alunos', validateBody(matriculaSchema), turmaController.matricularAluno);
turmaRoutes.delete('/:id/alunos/:alunoId', turmaController.removerAluno);

turmaRoutes.get('/:id/professores', turmaController.listProfessores);
turmaRoutes.post('/:id/professores', validateBody(atribuicaoSchema), turmaController.atribuirProfessor);
turmaRoutes.delete('/:id/professores/:atribuicaoId', turmaController.removerAtribuicao);
