import { Router } from 'express';
import * as healthController from '../controllers/healthController.js';
import { adminRoutes } from './adminRoutes.js';
import { alunoRoutes } from './alunoRoutes.js';
import { authRoutes } from './authRoutes.js';
import { disciplinaRoutes } from './disciplinaRoutes.js';
import { turmaRoutes } from './turmaRoutes.js';
import { usuarioRoutes } from './usuarioRoutes.js';

export const apiRoutes = Router();

apiRoutes.get('/health', healthController.health);
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/admin', adminRoutes);
apiRoutes.use('/usuarios', usuarioRoutes);
apiRoutes.use('/alunos', alunoRoutes);
apiRoutes.use('/disciplinas', disciplinaRoutes);
apiRoutes.use('/turmas', turmaRoutes);
