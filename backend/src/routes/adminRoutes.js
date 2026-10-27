import { Router } from 'express';
import { ROLES } from '../config/roles.js';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';

export const adminRoutes = Router();

// Todas as rotas deste grupo exigem login e perfil ADMIN.
adminRoutes.use(authenticate, authorize(ROLES.ADMIN));

adminRoutes.get('/ping', adminController.checkAdminAccess);
