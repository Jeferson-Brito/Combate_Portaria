import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../core/errors/app-error.js';
import { Role } from '../../middlewares/rbac.middleware.js';

export interface CreateUserParams {
  organizationId: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  creatorRole: Role;
}

export interface ListUsersParams {
  organizationId: string;
  role?: string;
  search?: string;
}

export class UserService {
  async create({ organizationId, name, email, password, role, phone, creatorRole }: CreateUserParams) {
    // Validação de hierarquia RBAC
    if (creatorRole === 'CONCIERGE') {
      throw new AppError('Porteiros não têm permissão para criar usuários.', 403, 'FORBIDDEN');
    }

    if (creatorRole === 'SUPERVISOR' && role !== 'CONCIERGE') {
      throw new AppError('Supervisores só possuem permissão para cadastrar porteiros.', 403, 'FORBIDDEN');
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new AppError('Este e-mail já está sendo utilizado por outro usuário.', 409, 'EMAIL_IN_USE');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        organizationId,
        name,
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
        phone,
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  async list({ organizationId, role, search }: ListUsersParams) {
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(role ? { role } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return users;
  }

  async toggleActive(userId: string, organizationId: string, actorRole: Role) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== organizationId || user.deletedAt) {
      throw new AppError('Usuário não encontrado.', 404, 'USER_NOT_FOUND');
    }

    if (actorRole === 'SUPERVISOR' && user.role !== 'CONCIERGE') {
      throw new AppError('Supervisores só podem alterar o status de porteiros.', 403, 'FORBIDDEN');
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, name: true, isActive: true },
    });

    return updated;
  }

  async delete(userId: string, organizationId: string, actorRole: Role) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== organizationId || user.deletedAt) {
      throw new AppError('Usuário não encontrado.', 404, 'USER_NOT_FOUND');
    }

    if (actorRole === 'SUPERVISOR' && user.role !== 'CONCIERGE') {
      throw new AppError('Supervisores só podem excluir porteiros.', 403, 'FORBIDDEN');
    }

    // Soft delete para compliance e auditoria
    await prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { success: true };
  }
}
