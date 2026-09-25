import { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../core/errors/app-error.js';

export interface TokenPayload {
  sub: string;
  organizationId: string;
  role: string;
  email: string;
  name: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: TokenPayload;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new AppError('Token de autenticação não fornecido', 401, 'TOKEN_MISSING');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Formato de token inválido. Esperado Bearer <token>', 401, 'TOKEN_MALFORMED');
    }

    const decoded = await request.jwtVerify<TokenPayload>();
    request.user = decoded;
  } catch (err: any) {
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        success: false,
        error: {
          code: err.code || 'UNAUTHORIZED',
          message: err.message,
        },
      });
    }

    return reply.status(401).send({
      success: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Token inválido ou expirado. Faça login novamente.',
      },
    });
  }
}
