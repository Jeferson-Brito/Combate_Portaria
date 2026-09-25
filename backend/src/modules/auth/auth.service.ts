import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../core/errors/app-error.js';

export interface LoginParams {
  email: string;
  password: string;
}

export class AuthService {
  async authenticate({ email, password }: LoginParams) {
    const user = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        deletedAt: null,
      },
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw new AppError('E-mail ou senha incorretos.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Este usuário está inativo. Contate o administrador.', 403, 'USER_INACTIVE');
    }

    if (!user.organization.isActive) {
      throw new AppError('A organização está inativa no sistema.', 403, 'ORGANIZATION_INACTIVE');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError('E-mail ou senha incorretos.', 401, 'INVALID_CREDENTIALS');
    }

    // Atualiza último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Registra log de auditoria
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        payload: JSON.stringify({ role: user.role, email: user.email }),
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new AppError('Usuário não encontrado.', 404, 'USER_NOT_FOUND');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      organization: user.organization,
    };
  }
}
