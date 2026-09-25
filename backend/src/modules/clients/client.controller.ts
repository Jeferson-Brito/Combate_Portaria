import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ClientService } from './client.service.js';

const createClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  whatsappNumber: z.string().min(1, 'Número de WhatsApp é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  document: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  destinationIds: z.array(z.string().uuid()).optional(),
});

const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  whatsappNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  document: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  destinationIds: z.array(z.string().uuid()).optional(),
});

const clientService = new ClientService();

export class ClientController {
  async search(request: FastifyRequest<{ Querystring: { q?: string } }>, reply: FastifyReply) {
    try {
      const query = request.query.q || '';
      const clients = await clientService.search(request.user.organizationId, query);

      return reply.status(200).send({
        success: true,
        data: { clients },
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

  async list(request: FastifyRequest<{ Querystring: { page?: string; limit?: string } }>, reply: FastifyReply) {
    try {
      const page = request.query.page ? parseInt(request.query.page, 10) : 1;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 20;

      const result = await clientService.list(request.user.organizationId, page, limit);

      return reply.status(200).send({
        success: true,
        data: result,
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
      const client = await clientService.getById(id, request.user.organizationId);

      return reply.status(200).send({
        success: true,
        data: { client },
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

  async create(request: FastifyRequest, reply: FastifyReply) {
    const parseResult = createClientSchema.safeParse(request.body);

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
      const client = await clientService.create({
        ...parseResult.data,
        email: parseResult.data.email || undefined,
        organizationId: request.user.organizationId,
      });

      return reply.status(201).send({
        success: true,
        data: { client },
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
    const parseResult = updateClientSchema.safeParse(request.body);

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
      const updated = await clientService.update(id, request.user.organizationId, {
        ...parseResult.data,
        email: parseResult.data.email || undefined,
      });

      return reply.status(200).send({
        success: true,
        data: { client: updated },
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
      await clientService.delete(id, request.user.organizationId);

      return reply.status(200).send({
        success: true,
        message: 'Cliente removido com sucesso.',
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
