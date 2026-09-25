import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { DestinationService } from './destination.service.js';

const createDestinationSchema = z.object({
  name: z.string().min(1, 'Nome do destino é obrigatório'),
  block: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
});

const updateDestinationSchema = z.object({
  name: z.string().optional(),
  block: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const destinationService = new DestinationService();

export class DestinationController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = createDestinationSchema.safeParse(request.body);

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
      const destination = await destinationService.create({
        ...parseResult.data,
        organizationId: request.user.organizationId,
      });

      return reply.status(201).send({
        success: true,
        data: { destination },
      });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message,
        },
      });
    }
  }

  async list(request: FastifyRequest<{ Querystring: { search?: string } }>, reply: FastifyReply) {
    try {
      const search = request.query.search;
      const destinations = await destinationService.list(request.user.organizationId, search);

      return reply.status(200).send({
        success: true,
        data: { destinations },
      });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message,
        },
      });
    }
  }

  async getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const destination = await destinationService.getById(id, request.user.organizationId);

      return reply.status(200).send({
        success: true,
        data: { destination },
      });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message,
        },
      });
    }
  }

  async update(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const parseResult = updateDestinationSchema.safeParse(request.body);

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
      const { id } = request.params;
      const updated = await destinationService.update(id, request.user.organizationId, parseResult.data);

      return reply.status(200).send({
        success: true,
        data: { destination: updated },
      });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message,
        },
      });
    }
  }

  async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      await destinationService.delete(id, request.user.organizationId);

      return reply.status(200).send({
        success: true,
        message: 'Destino removido com sucesso.',
      });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({
        success: false,
        error: {
          code: err.code || 'INTERNAL_ERROR',
          message: err.message,
        },
      });
    }
  }
}
