import { Router } from 'express';
import * as conversaController from '../controllers/conversaController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import {
  contatosQuerySchema,
  listConversasQuerySchema,
  mensagemSchema,
  novaConversaSchema,
} from '../validators/conversaValidators.js';

/**
 * /api/conversas — todos os perfis. O que cada um vê e com quem pode falar
 * é decidido no service (a partir de req.user), nunca por um id vindo do cliente.
 */
export const conversaRoutes = Router();
conversaRoutes.use(authenticate);

conversaRoutes.get('/', validateQuery(listConversasQuerySchema), conversaController.list);
conversaRoutes.post('/', validateBody(novaConversaSchema), conversaController.create);
// Antes de "/:id" para "contatos" não ser lido como id.
conversaRoutes.get('/contatos', validateQuery(contatosQuerySchema), conversaController.contatos);
conversaRoutes.get('/:id', conversaController.getById);
conversaRoutes.post('/:id/mensagens', validateBody(mensagemSchema), conversaController.enviar);
conversaRoutes.post('/:id/lida', conversaController.marcarLida);
