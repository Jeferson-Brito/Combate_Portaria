import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

describe('Reports & Audit Modules (Fase 9)', () => {
  let app: any;
  let token: string;
  let orgId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Cria org e usuário para o teste
    const org = await prisma.organization.create({
      data: {
        name: 'Condomínio Relatórios Teste',
        slug: `condo-reports-${Date.now()}`,
      },
    });
    orgId = org.id;

    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        name: 'Supervisor Relatorios',
        email: `sup-reports-${Date.now()}@teste.com`,
        passwordHash: 'hash123',
        role: 'SUPERVISOR',
      },
    });

    token = app.jwt.sign({
      sub: user.id,
      organizationId: org.id,
      role: user.role,
    });

    // Cria destino e cliente
    const dest = await prisma.destination.create({
      data: {
        organizationId: org.id,
        name: 'Apto 101',
        block: 'Bloco A',
      },
    });

    const client = await prisma.client.create({
      data: {
        organizationId: org.id,
        name: 'Morador Teste',
        whatsappNumber: '5511999990001',
      },
    });

    const visitor = await prisma.visitor.create({
      data: {
        organizationId: org.id,
        name: 'Visitante Relatório',
      },
    });

    // Cria visita com answeredAt e entryAt/exitAt para testar métricas de tempo
    const now = new Date();
    const createdAt = new Date(now.getTime() - 120000); // 2 min atrás
    const answeredAt = new Date(now.getTime() - 60000);  // 1 min depois de criado
    const entryAt = new Date(now.getTime() - 50000);     // 50 seg atrás
    const exitAt = new Date(now.getTime() - 10000);      // 10 seg atrás

    const visit = await prisma.visitRequest.create({
      data: {
        organizationId: org.id,
        code: `REQ-REP-${Date.now()}`,
        destinationId: dest.id,
        clientId: client.id,
        visitorId: visitor.id,
        conciergeUserId: user.id,
        visitorType: 'Prestador',
        visitReason: 'Manutenção',
        status: 'EXITED',
        createdAt,
        answeredAt,
        entryAt,
        exitAt,
      },
    });

    // Cria evento de timeline
    await prisma.visitEvent.create({
      data: {
        visitRequestId: visit.id,
        eventType: 'AUTHORIZED',
        description: 'Morador autorizou via WhatsApp',
        actorType: 'WHATSAPP_CLIENT',
        actorId: '5511999990001',
      },
    });

    // Cria log de auditoria
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        action: 'VISIT_EXIT',
        entity: 'VisitRequest',
        entityId: visit.id,
        payload: JSON.stringify({ notes: 'Saída registrada com sucesso' }),
      },
    });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({
      where: { id: orgId },
    });
    await app.close();
  });

  it('deve retornar métricas consolidadas da portaria (GET /api/v1/reports/metrics)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/metrics?days=7',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.summary.total).toBeGreaterThanOrEqual(1);
    expect(body.data.summary.approvalRate).toBe(100);
    expect(body.data.performance.averageResponseTimeSeconds).toBeGreaterThan(0);
    expect(body.data.periodBreakdown).toBeDefined();
    expect(body.data.topDestinations.length).toBeGreaterThan(0);
  });

  it('deve listar relatório filtrável de visitas (GET /api/v1/reports/visits)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reports/visits?visitorType=Prestador',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(1);
    expect(body.data[0].metrics.responseTimeSeconds).toBe(60);
  });

  it('deve listar logs de auditoria (GET /api/v1/audit/logs)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/audit/logs',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.data[0].action).toBe('VISIT_EXIT');
  });

  it('deve listar timeline unificada de eventos (GET /api/v1/audit/timeline)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/audit/timeline',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.data[0].eventType).toBe('AUTHORIZED');
  });
});
