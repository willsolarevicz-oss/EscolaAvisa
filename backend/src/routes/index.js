import { Router } from 'express';
import * as healthController from '../controllers/healthController.js';
import { adminRoutes } from './adminRoutes.js';
import { alunoRoutes } from './alunoRoutes.js';
import { authRoutes } from './authRoutes.js';
import { avisoRoutes } from './avisoRoutes.js';
import { disciplinaRoutes } from './disciplinaRoutes.js';
import { calendarioRoutes, eventoRoutes } from './eventoRoutes.js';
import { meRoutes } from './meRoutes.js';
import { notaRoutes } from './notaRoutes.js';
import { ocorrenciaRoutes } from './ocorrenciaRoutes.js';
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
apiRoutes.use('/avisos', avisoRoutes);
apiRoutes.use('/ocorrencias', ocorrenciaRoutes);
apiRoutes.use('/notas', notaRoutes);
apiRoutes.use('/calendario', calendarioRoutes);
apiRoutes.use('/eventos', eventoRoutes);
apiRoutes.use('/me', meRoutes);
