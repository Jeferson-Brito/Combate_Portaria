import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller.js';
import { authMiddleware } from '../../middlewares/auth.middleware.js';

const authController = new AuthController();

export async function authRoutes(app: FastifyInstance) {
  // Rota pública de login
  app.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
    handler: authController.login.bind(authController),
  });

  // Rota privada de perfil
  app.get('/me', {
    preHandler: [authMiddleware],
    handler: authController.me.bind(authController),
  });
}
