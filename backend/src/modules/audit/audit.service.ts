import { prisma } from '../../lib/prisma.js';

export interface CreateAuditLogParams {
  organizationId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  ipAddress?: string;
  payload?: any;
}

export class AuditService {
  async log(params: CreateAuditLogParams) {
    return prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        payload: params.payload ? JSON.stringify(params.payload) : null,
      },
    });
  }

  async listLogs(organizationId: string, page = 1, limit = 50, filters?: { action?: string; entity?: string }) {
    const skip = (page - 1) * limit;
    const where: any = { organizationId };

    if (filters?.action) {
      where.action = filters.action;
    }
    if (filters?.entity) {
      where.entity = filters.entity;
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: logs.map(log => ({
        ...log,
        payload: log.payload ? JSON.parse(log.payload) : null,
      })),
    };
  }

  async listTimelineEvents(organizationId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [total, events] = await Promise.all([
      prisma.visitEvent.count({
        where: {
          visitRequest: {
            organizationId,
          },
        },
      }),
      prisma.visitEvent.findMany({
        where: {
          visitRequest: {
            organizationId,
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          visitRequest: {
            select: {
              code: true,
              visitor: { select: { name: true } },
              client: { select: { name: true } },
              destination: { select: { name: true, block: true } },
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: events.map(evt => ({
        ...evt,
        metadata: evt.metadata ? JSON.parse(evt.metadata) : null,
      })),
    };
  }
}

export const auditService = new AuditService();
