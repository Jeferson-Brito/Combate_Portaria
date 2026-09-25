import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { FastifyInstance } from 'fastify';

describe('Módulo de Clientes & Destinos - FASE 2', () => {
  let app: FastifyInstance;
  let conciergeToken: string;
  let supervisorToken: string;
  let createdDestinationId: string;
  let createdClientId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // 1. Obtém token do porteiro
    const conciergeLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'porteiro@example.com', password: 'porteiro123456' },
    });
    conciergeToken = JSON.parse(conciergeLogin.payload).data.token;

    // 2. Obtém token do supervisor
    const supervisorLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'supervisor@example.com', password: 'supervisor123456' },
    });
    supervisorToken = JSON.parse(supervisorLogin.payload).data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve permitir que o Supervisor cadastre um novo destino/unidade', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/destinations',
      headers: { Authorization: `Bearer ${supervisorToken}` },
      payload: {
        name: 'Consultório 10',
        block: 'Ala Norte',
        code: 'CONS-10',
        description: 'Sala de atendimento médico',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.destination.name).toBe('Consultório 10');
    expect(body.data.destination.code).toBe('CONS-10');

    createdDestinationId = body.data.destination.id;
  });

  it('deve bloquear o Porteiro de criar um destino (RBAC: 403 Forbidden)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/destinations',
      headers: { Authorization: `Bearer ${conciergeToken}` },
      payload: {
        name: 'Sala Proibida',
      },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('deve permitir que o Porteiro liste destinos cadastrados', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/destinations',
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.destinations)).toBe(true);
    expect(body.data.destinations.length).toBeGreaterThanOrEqual(1);
  });

  it('deve validar e rejeitar cadastro de cliente com número de WhatsApp inválido', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/clients',
      headers: { Authorization: `Bearer ${supervisorToken}` },
      payload: {
        name: 'Cliente Teste',
        whatsappNumber: '1234', // Inválido
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_WHATSAPP');
  });

  it('deve cadastrar cliente com formatação automática E.164 e vínculo com destino', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/clients',
      headers: { Authorization: `Bearer ${supervisorToken}` },
      payload: {
        name: 'Dra. Fernanda Lima',
        whatsappNumber: '(11) 98765-4321', // Formato com máscara
        email: 'fernanda.lima@clinica.com',
        company: 'Clínica Saúde',
        destinationIds: [createdDestinationId],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.client.name).toBe('Dra. Fernanda Lima');
    expect(body.data.client.whatsappNumber).toBe('5511987654321'); // Sanitizado com DDI 55
    expect(body.data.client.destinations.length).toBe(1);
    expect(body.data.client.destinations[0].destination.name).toBe('Consultório 10');

    createdClientId = body.data.client.id;
  });

  it('Porteiro: deve encontrar cliente ao buscar pelo número da unidade "8"', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/clients/search?q=8',
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);

    const found = body.data.clients.find((c: any) => c.name === 'Carlos Souza');
    expect(found).toBeDefined();
    expect(found.destinations.some((d: any) => d.destination.name.includes('Apartamento 8'))).toBe(true);
  });

  it('Porteiro: deve encontrar cliente ao buscar pelo nome "João"', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/clients/search?q=Jo%C3%A3o',
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);

    const found = body.data.clients.find((c: any) => c.name.includes('João'));
    expect(found).toBeDefined();
  });

  it('Porteiro: deve encontrar cliente ao buscar pelo código da unidade "CONS-10"', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/clients/search?q=CONS-10',
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);

    const found = body.data.clients.find((c: any) => c.name.includes('Fernanda'));
    expect(found).toBeDefined();
  });

  it('deve bloquear o Porteiro de excluir um cliente (RBAC: 403 Forbidden)', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/clients/${createdClientId}`,
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('deve permitir que o Supervisor exclua o cliente (soft delete)', async () => {
    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/clients/${createdClientId}`,
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);

    // Confirma que não aparece mais na busca do porteiro
    const searchRes = await app.inject({
      method: 'GET',
      url: '/api/v1/clients/search?q=Fernanda',
      headers: { Authorization: `Bearer ${conciergeToken}` },
    });
    const searchBody = JSON.parse(searchRes.payload);
    expect(searchBody.data.clients.some((c: any) => c.id === createdClientId)).toBe(false);
  });
});
