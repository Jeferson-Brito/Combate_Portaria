import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../core/errors/app-error.js';

export interface CreateDestinationParams {
  organizationId: string;
  name: string;
  block?: string;
  code?: string;
  description?: string;
}

export interface UpdateDestinationParams {
  name?: string;
  block?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export class DestinationService {
  async create({ organizationId, name, block, code, description }: CreateDestinationParams) {
    if (!name || name.trim().length === 0) {
      throw new AppError('O nome do destino/unidade é obrigatório.', 400, 'NAME_REQUIRED');
    }

    const destination = await prisma.destination.create({
      data: {
        organizationId,
        name: name.trim(),
        block: block ? block.trim() : null,
        code: code ? code.trim().toUpperCase() : null,
        description: description ? description.trim() : null,
      },
    });

    return destination;
  }

  async list(organizationId: string, search?: string) {
    const destinations = await prisma.destination.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { code: { contains: search } },
                { block: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        clients: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                whatsappNumber: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return destinations;
  }

  async getById(id: string, organizationId: string) {
    const destination = await prisma.destination.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        clients: {
          include: {
            client: true,
          },
        },
      },
    });

    if (!destination) {
      throw new AppError('Destino/unidade não encontrado.', 404, 'DESTINATION_NOT_FOUND');
    }

    return destination;
  }

  async update(id: string, organizationId: string, data: UpdateDestinationParams) {
    await this.getById(id, organizationId);

    const updated = await prisma.destination.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.block !== undefined ? { block: data.block ? data.block.trim() : null } : {}),
        ...(data.code !== undefined ? { code: data.code ? data.code.trim().toUpperCase() : null } : {}),
        ...(data.description !== undefined ? { description: data.description ? data.description.trim() : null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    return updated;
  }

  async delete(id: string, organizationId: string) {
    await this.getById(id, organizationId);

    // Soft delete
    await prisma.destination.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { success: true };
  }
}
