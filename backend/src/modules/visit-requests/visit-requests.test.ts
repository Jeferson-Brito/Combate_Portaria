import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { FastifyInstance } from 'fastify';

describe('Módulo de Solicitações de Acesso & Dashboard - FASE 4', () => {
  let app: FastifyInstance;
  let conciergeToken: string;
  let clientId: string;
  let destinationId: string;
  let visitorId: string;
  let createdRequestId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // 1. Obtém token de porteiro
    const conciergeLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'porteiro@example.com', password: 'porteiro123456' },
    });
    conciergeToken = JSON.parse(conciergeLogin.payload).data.token;

    // 2. Localiza cliente existente do seed (Carlos Souza - Apto 8)
    const clientsRes = await app.inject({
      method: 'GET',
      url: '/api/v1/clients/search?q=8',
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });
    const client = JSON.parse(clientsRes.payload).data.clients[0];
    clientId = client.id;
    destinationId = client.destinations[0].destination.id;

    // 3. Localiza ou cadastra visitante de teste
    const visitorRes = await app.inject({
      method: 'POST',
      url: '/api/v1/visitors',
      headers: { Authorization: `Bearer ${conciergeToken}` },
      payload: {
        name: 'Guilherme Peixoto',
        documentType: 'CPF',
        documentNumber: '987.654.321-99',
        company: 'Telefônica Fibra',
        vehicle: {
          model: 'VW Gol',
          color: 'Branco',
          licensePlate: 'TEL1G23',
        },
      },
    });
    visitorId = JSON.parse(visitorRes.payload).data.visitor.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Porteiro: deve criar uma nova solicitação de visita com status PENDING e código sequencial', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/visit-requests',
      headers: { Authorization: `Bearer ${conciergeToken}` },
      payload: {
        clientId,
        destinationId,
        visitorId,
        visitorType: 'Técnico',
        visitReason: 'Instalação de Internet Fibra',
        notes: 'Aguardando na guarita com escada e equipamentos',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.visitRequest.status).toBe('PENDING');
    expect(body.data.visitRequest.code).toMatch(/^REQ-\d{4}-\d{6}$/);
    expect(body.data.visitRequest.visitor.name).toBe('Guilherme Peixoto');
    expect(body.data.visitRequest.destination.name).toBe('Apartamento 8');

    createdRequestId = body.data.visitRequest.id;
  });

  it('Porteiro: deve listar as solicitações em aberto com cálculo de tempo decorrido no servidor', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/visit-requests/pending',
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.requests)).toBe(true);
    expect(body.data.requests.length).toBeGreaterThanOrEqual(1);

    const pendingItem = body.data.requests.find((r: any) => r.id === createdRequestId);
    expect(pendingItem).toBeDefined();
    expect(pendingItem.waitingTimeSeconds).toBeGreaterThanOrEqual(0);
    expect(pendingItem.waitingTimeFormatted).toBeDefined();
    expect(pendingItem.serverTime).toBeDefined();
  });

  it('Dashboard: deve retornar os contadores resumidos da portaria', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/visit-requests/summary',
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.pendingCount).toBeGreaterThanOrEqual(1);
    expect(body.data.authorizedCount).toBeDefined();
    expect(body.data.presentCount).toBeDefined();
    expect(body.data.deniedTodayCount).toBeDefined();
  });

  it('Porteiro: deve reenviar lembrete pelo WhatsApp respeitando o limite máximo de 3 tentativas', async () => {
    // 1º Lembrete
    const res1 = await app.inject({
      method: 'POST',
      url: `/api/v1/visit-requests/${createdRequestId}/remind`,
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });
    expect(res1.statusCode).toBe(200);
    expect(JSON.parse(res1.payload).data.visitRequest.remindersSentCount).toBe(1);

    // 2º Lembrete
    const res2 = await app.inject({
      method: 'POST',
      url: `/api/v1/visit-requests/${createdRequestId}/remind`,
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });
    expect(res2.statusCode).toBe(200);
    expect(JSON.parse(res2.payload).data.visitRequest.remindersSentCount).toBe(2);

    // 3º Lembrete
    const res3 = await app.inject({
      method: 'POST',
      url: `/api/v1/visit-requests/${createdRequestId}/remind`,
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });
    expect(res3.statusCode).toBe(200);
    expect(JSON.parse(res3.payload).data.visitRequest.remindersSentCount).toBe(3);

    // 4º Lembrete -> Deve ser bloqueado por exceder o limite (429)
    const res4 = await app.inject({
      method: 'POST',
      url: `/api/v1/visit-requests/${createdRequestId}/remind`,
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });
    expect(res4.statusCode).toBe(429);
    expect(JSON.parse(res4.payload).error.code).toBe('MAX_REMINDERS_EXCEEDED');
  });

  it('Porteiro: deve consultar os detalhes completos e a timeline de eventos da visita', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/visit-requests/${createdRequestId}`,
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);

    const visit = body.data.visitRequest;
    expect(visit.events.length).toBeGreaterThanOrEqual(4); // CREATED + WA_SENT + 3x REMINDER_SENT
    expect(visit.events[0].eventType).toBe('CREATED');
    expect(visit.events.some((e: any) => e.eventType === 'WA_SENT')).toBe(true);
    expect(visit.events.some((e: any) => e.eventType === 'REMINDER_SENT')).toBe(true);
  });

  it('Porteiro: deve permitir autorização manual de contingência (ex: contato telefônico)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/visit-requests/${createdRequestId}/authorize-manual`,
      headers: { Authorization: `Bearer ${conciergeToken}` },
      payload: { reason: 'Morador Carlos confirmou por interfone' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.visitRequest.status).toBe('AUTHORIZED');
  });

  it('Histórico: deve listar o histórico paginado com filtros', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/visit-requests/history?status=AUTHORIZED',
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.requests.length).toBeGreaterThanOrEqual(1);
    expect(body.data.meta.total).toBeGreaterThanOrEqual(1);
  });
});
