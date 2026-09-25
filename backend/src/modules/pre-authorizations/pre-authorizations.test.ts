import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';

describe('Módulo de Pré-Autorizações - FASE 7', () => {
  let app: FastifyInstance;
  let authToken: string;
  let orgId: string;
  let clientId: string;
  let destinationId: string;
  let createdPreAuthId: string;

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

    clientId = client?.id || '';
    destinationId = dest?.id || '';
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve cadastrar uma pré-autorização para visita agendada hoje', async () => {
    const today = new Date().toISOString().split('T')[0];

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-authorizations',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        clientId,
        destinationId,
        visitorName: 'Carlos Eduardo da Silva',
        visitorDocument: '45678912300',
        company: 'ABC Climatização',
        phone: '+5511988887777',
        visitorType: 'Prestador de Serviço',
        startDate: today,
        endDate: today,
        expectedTimeStart: '14:00',
        expectedTimeEnd: '18:00',
        notes: 'Manutenção programada no ar condicionado',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.visitorName).toBe('Carlos Eduardo da Silva');
    expect(body.data.isUsed).toBe(false);

    createdPreAuthId = body.data.id;
  });

  it('deve listar pré-autorizações válidas hoje no endpoint /today', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/pre-authorizations/today',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.count).toBeGreaterThanOrEqual(1);

    const found = body.data.items.find((item: any) => item.id === createdPreAuthId);
    expect(found).toBeDefined();
    expect(found.visitorName).toBe('Carlos Eduardo da Silva');
  });

  it('deve filtrar pré-autorização ativa por busca textual (?q=Climatização)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/pre-authorizations/today?q=Climatização',
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(body.data.items[0].company).toContain('Climatização');
  });

  it('deve efetivar entrada do visitante pré-autorizado na portaria (Check-in / Liberar)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/pre-authorizations/${createdPreAuthId}/checkin`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        vehicleModel: 'Fiat Fiorino',
        vehiclePlate: 'FIO1A23',
        vehicleColor: 'Branca',
        notes: 'Chegou com crachá e ferramentas da ABC',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('AUTHORIZED');
    expect(body.data.visitor.name).toBe('Carlos Eduardo da Silva');
    expect(body.data.vehicle.licensePlate).toBe('FIO1A23');

    // Verifica que a pré-autorização foi marcada como utilizada
    const checkUsed = await prisma.preAuthorization.findUnique({
      where: { id: createdPreAuthId },
    });
    expect(checkUsed?.isUsed).toBe(true);
  });

  it('deve rejeitar check-in em pré-autorização que já foi utilizada', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/pre-authorizations/${createdPreAuthId}/checkin`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        notes: 'Tentativa de reuso indevido',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('PRE_AUTH_ALREADY_USED');
  });

  it('deve cadastrar e permitir cancelar uma pré-autorização não utilizada', async () => {
    const today = new Date().toISOString().split('T')[0];

    // Cria uma segunda pré-autorização
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/pre-authorizations',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        clientId,
        destinationId,
        visitorName: 'Visitante Para Cancelar',
        startDate: today,
        endDate: today,
      },
    });

    const newId = JSON.parse(createRes.payload).data.id;

    // Cancela
    const cancelRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/pre-authorizations/${newId}`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(cancelRes.statusCode).toBe(200);
    const body = JSON.parse(cancelRes.payload);
    expect(body.success).toBe(true);

    // Verifica exclusão
    const checkDeleted = await prisma.preAuthorization.findUnique({
      where: { id: newId },
    });
    expect(checkDeleted).toBeNull();
  });
});
