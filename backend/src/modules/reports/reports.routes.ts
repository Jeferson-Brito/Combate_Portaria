import { FastifyInstance } from 'fastify';
import { reportsController } from './reports.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

export async function reportsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/visits', reportsController.getVisits);
  app.get('/metrics', reportsController.getMetrics);
}
