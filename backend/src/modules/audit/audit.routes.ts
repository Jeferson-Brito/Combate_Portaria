import { FastifyInstance } from 'fastify';
import { auditController } from './audit.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

export async function auditRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/logs', auditController.getLogs);
  app.get('/timeline', auditController.getTimeline);
}
