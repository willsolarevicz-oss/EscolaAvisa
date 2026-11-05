import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as usuarioController from '../controllers/usuarioController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import {
  createUsuarioSchema,
  listUsuariosQuerySchema,
  resetSenhaSchema,
  setAtivoSchema,
  updateUsuarioSchema,
} from '../validators/usuarioValidators.js';

export const usuarioRoutes = Router();

// Gestão de usuários é exclusiva da administração.
usuarioRoutes.use(authenticate, authorize(ROLES.ADMIN));

usuarioRoutes.get('/', validateQuery(listUsuariosQuerySchema), usuarioController.list);
usuarioRoutes.post('/', validateBody(createUsuarioSchema), usuarioController.create);
usuarioRoutes.get('/:id', usuarioController.getById);
usuarioRoutes.put('/:id', validateBody(updateUsuarioSchema), usuarioController.update);
usuarioRoutes.patch('/:id/ativo', validateBody(setAtivoSchema), usuarioController.setAtivo);
usuarioRoutes.patch('/:id/senha', validateBody(resetSenhaSchema), usuarioController.resetSenha);
