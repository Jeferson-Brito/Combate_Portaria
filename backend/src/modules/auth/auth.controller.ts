import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth.service.js';

const loginBodySchema = z.object({
  email: z.string().email('E-mail em formato inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const authService = new AuthService();

export class AuthController {
  async login(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = loginBodySchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.errors[0].message,
        },
      });
    }

    try {
      const { user } = await authService.authenticate(parseResult.data);

      // Gera token de acesso JWT
      const token = await reply.jwtSign(
        {
          organizationId: user.organizationId,
          role: user.role,
          email: user.email,
          name: user.name,
        },
        {
          sign: {
            sub: user.id,
            expiresIn: '1d',
          },
        }
      );

      // Gera refresh token
      const refreshToken = await reply.jwtSign(
        {
          sub: user.id,
          organizationId: user.organizationId,
        },
        {
          sign: {
            expiresIn: '7d',
          },
        }
      );

      return reply.status(200).send({
        success: true,
        data: {
          user,
          token,
          refreshToken,
        },
      });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'Erro interno ao autenticar usuário.',
        },
      });
    }
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user.sub;
      const user = await authService.getProfile(userId);

      return reply.status(200).send({
        success: true,
        data: { user },
      });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message || 'Erro ao obter dados do usuário logado.',
        },
      });
    }
  }
}
