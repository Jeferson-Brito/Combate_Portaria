import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../core/errors/app-error.js';

export interface CreateOrganizationParams {
  name: string;
  document?: string;
  slug: string;
  settings?: Record<string, any>;
}

export class OrganizationService {
  async create({ name, document, slug, settings }: CreateOrganizationParams) {
    const existingOrg = await prisma.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      throw new AppError('Já existe uma organização com este slug/identificador.', 409, 'SLUG_IN_USE');
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        document,
        slug,
        settings: settings ? JSON.stringify(settings) : null,
      },
    });

    // Cria templates de mensagens padrão para esta organização
    await prisma.messageTemplate.createMany({
      data: [
        {
          organizationId: organization.id,
          type: 'APPROVAL_REQUEST',
          title: 'Solicitação de Autorização',
          content: 'Olá, {{cliente}}! Há um visitante aguardando sua autorização na portaria.\n\n👤 Visitante: {{visitante}}\n🏢 Empresa: {{empresa}}\n📋 Motivo: {{motivo}}\n⏰ Chegada: {{horario}}\n🚗 Veículo: {{veiculo}}\n\nPor favor, responda com:\n*1* para AUTORIZAR\n*2* para RECUSAR',
        },
        {
          organizationId: organization.id,
          type: 'REMINDER',
          title: 'Lembrete de Autorização',
          content: '⏳ Olá, {{cliente}}! O visitante *{{visitante}}* ainda aguarda sua liberação na portaria.\n\nPor favor, responda com *1* para AUTORIZAR ou *2* para RECUSAR.',
        },
      ],
    });

    return organization;
  }

  async getById(id: string) {
    const org = await prisma.organization.findUnique({
      where: { id },
    });

    if (!org) {
      throw new AppError('Organização não encontrada.', 404, 'ORGANIZATION_NOT_FOUND');
    }

    return org;
  }
}
