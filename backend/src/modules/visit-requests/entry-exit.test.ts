import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';

describe('Módulo de Controle de Entrada e Saída - FASE 8', () => {
  let app: FastifyInstance;
  let authToken: string;
  let orgId: string;
  let requestId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Login do porteiro
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'porteiro@example.com',
        password: 'porteiro123456',
      },
    });

    const body = JSON.parse(loginRes.payload);
    authToken = body.data.token;
    orgId = body.data.user.organizationId;

    const client = await prisma.client.findFirst({ where: { organizationId: orgId } });
    const dest = await prisma.destination.findFirst({ where: { organizationId: orgId } });
    const visitor = await prisma.visitor.findFirst({ where: { organizationId: orgId } });

    // Cria solicitação inicial
    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/v1/visit-requests',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        clientId: client?.id,
        destinationId: dest?.id,
        visitorId: visitor?.id,
        visitorType: 'Prestador de Serviço',
        visitReason: 'Instalação de Internet para Teste de Entrada/Saída',
      },
    });

    const parsed = JSON.parse(reqRes.payload);
    requestId = parsed.data.visitRequest?.id || parsed.data?.id;

    // Autoriza manualmente para deixar pronta para entrada
    await app.inject({
      method: 'POST',
      url: `/api/v1/visit-requests/${requestId}/authorize-manual`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { reason: 'Autorizado para teste de fluxo de entrada' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve registrar entrada física do visitante no local (AUTHORIZED -> ENTERED)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/visit-requests/${requestId}/entry`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { reason: 'Portão 1 liberado' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.visitRequest.status).toBe('ENTERED');
    expect(body.data.visitRequest.entryAt).toBeDefined();

    // Verifica timeline
    const events = await prisma.visitEvent.findMany({
      where: { visitRequestId: requestId, eventType: 'ENTRY_RECORDED' },
    });
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it('deve listar o visitante na lista de presentes no local (GET /present)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/visit-requests/present',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.count).toBeGreaterThanOrEqual(1);

    const found = body.data.visitors.find((v: any) => v.id === requestId);
    expect(found).toBeDefined();
    expect(found.status).toBe('ENTERED');
    expect(found.stayDurationFormatted).toBeDefined();
  });

  it('deve rejeitar registrar entrada de visitante que já entrou (deve falhar com 400)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/visit-requests/${requestId}/entry`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_STATUS');
  });

  it('deve registrar saída física do visitante do local (ENTERED -> EXITED)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/visit-requests/${requestId}/exit`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { reason: 'Devolveu crachá de visitante na portaria' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.visitRequest.status).toBe('EXITED');
    expect(body.data.visitRequest.exitAt).toBeDefined();

    // Verifica timeline
    const events = await prisma.visitEvent.findMany({
      where: { visitRequestId: requestId, eventType: 'EXIT_RECORDED' },
    });
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it('deve remover o visitante da lista de presentes após o registro de saída', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/visit-requests/present',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);

    const found = body.data.visitors.find((v: any) => v.id === requestId);
    expect(found).toBeUndefined();
  });

  it('deve rejeitar registrar saída de visitante que já saiu (deve falhar com 400)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/visit-requests/${requestId}/exit`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_STATUS');
  });
});
