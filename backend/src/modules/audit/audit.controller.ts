import { FastifyRequest, FastifyReply } from 'fastify';
import { auditService } from './audit.service.js';

export class AuditController {
  async getLogs(req: FastifyRequest, reply: FastifyReply) {
    const { organizationId } = (req as any).user;
    const { page, limit, action, entity } = req.query as {
      page?: string;
      limit?: string;
      action?: string;
      entity?: string;
    };

    const result = await auditService.listLogs(
      organizationId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      { action, entity }
    );

    return reply.send({ success: true, ...result });
  }

  async getTimeline(req: FastifyRequest, reply: FastifyReply) {
    const { organizationId } = (req as any).user;
    const { page, limit } = req.query as { page?: string; limit?: string };

    const result = await auditService.listTimelineEvents(
      organizationId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50
    );

    return reply.send({ success: true, ...result });
  }
}

export const auditController = new AuditController();
