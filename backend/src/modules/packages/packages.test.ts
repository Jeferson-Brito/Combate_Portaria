import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { prisma } from '../../lib/prisma.js';

describe('Módulo de Controle de Encomendas & Pacotes (Fase Avançada)', () => {
  let app: any;
  let token: string;
  let orgId: string;
  let destinationId: string;
  let clientId: string;
  let createdPackageId: string;
  let createdPickupCode: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // 1. Setup Organização
    const org = await prisma.organization.create({
      data: {
        name: 'Residencial Solar das Palmeiras',
        slug: `solar-palmeiras-${Date.now()}`,
      },
    });
    orgId = org.id;

    // 2. Setup Usuário Porteiro
    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        name: 'Porteiro Encomendas',
        email: `porteiro-pkg-${Date.now()}@teste.com`,
        passwordHash: 'hash123',
        role: 'CONCIERGE',
      },
    });

    token = app.jwt.sign({
      sub: user.id,
      organizationId: org.id,
      role: user.role,
    });

    // 3. Setup Unidade de Destino
    const dest = await prisma.destination.create({
      data: {
        organizationId: org.id,
        name: 'Apartamento 303',
        block: 'Bloco C',
      },
    });
    destinationId = dest.id;

    // 4. Setup Morador com WhatsApp
    const client = await prisma.client.create({
      data: {
        organizationId: org.id,
        name: 'Larissa Alencar',
        whatsappNumber: '5511977776666',
      },
    });
    clientId = client.id;

    await prisma.clientDestination.create({
      data: {
        clientId: client.id,
        destinationId: dest.id,
        isPrimary: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({
      where: { id: orgId },
    });
    await app.close();
  });

  it('Porteiro: deve registrar recebimento de encomenda com código de retirada de 4 dígitos', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/packages',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        destinationId,
        clientId,
        carrier: 'Mercado Livre',
        trackingCode: 'ML123456789BR',
        sender: 'Loja Oficial Samsung',
        recipientName: 'Larissa Alencar',
        notes: 'Caixa média frágil',
      },
    });

    if (res.statusCode !== 201) console.log('>>> TEST 1 PAYLOAD:', res.payload);
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('RECEIVED');
    expect(body.data.code).toMatch(/^ENC-\d{4}-\d{6}$/);
    expect(body.data.pickupCode).toMatch(/^\d{4}$/);
    expect(body.data.destination.name).toBe('Apartamento 303');

    createdPackageId = body.data.id;
    createdPickupCode = body.data.pickupCode;
  });

  it('Porteiro: deve listar encomendas pendentes aguardando retirada na guarita', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/packages/pending',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(1);
    const found = body.data.find((p: any) => p.id === createdPackageId);
    expect(found).toBeDefined();
    expect(found.carrier).toBe('Mercado Livre');
  });

  it('Porteiro: deve rejeitar retirada com código incorreto', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/packages/${createdPackageId}/pickup`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        pickupCode: '0000', // Código errado
        pickedUpBy: 'Estranho',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.message).toContain('Código de retirada incorreto');
  });

  it('Porteiro: deve confirmar entrega do pacote com código de retirada correto (RECEIVED -> PICKED_UP)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/packages/${createdPackageId}/pickup`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        pickupCode: createdPickupCode, // Código correto
        pickedUpBy: 'Larissa Alencar',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PICKED_UP');
    expect(body.data.pickedUpAt).toBeDefined();
    expect(body.data.pickedUpBy).toBe('Larissa Alencar');
  });

  it('Porteiro: pacote retirado não deve mais aparecer na lista de pendentes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/packages/pending',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    const found = body.data.find((p: any) => p.id === createdPackageId);
    expect(found).toBeUndefined();
  });
});
