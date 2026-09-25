import { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../core/errors/app-error.js';

export type Role = 'ADMIN' | 'SUPERVISOR' | 'CONCIERGE';

export function requireRole(allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = request.user?.role as Role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Você não possui permissão para executar esta ação.',
        },
      });
    }
  };
}
