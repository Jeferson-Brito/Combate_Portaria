import { FastifyInstance } from 'fastify';
import { packagesController } from './packages.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

export async function packageRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/', packagesController.create);
  app.get('/pending', packagesController.listPending);
  app.get('/history', packagesController.listHistory);
  app.post('/:id/pickup', packagesController.pickup);
  app.post('/:id/resend-code', packagesController.resendCode);
}
