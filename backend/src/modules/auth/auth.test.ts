import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { FastifyInstance } from 'fastify';

describe('Módulo de Autenticação & RBAC (FASE 1)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve responder com status ok no healthcheck para o Render', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('ok');
  });

  it('deve autenticar o porteiro com sucesso e retornar tokens JWT', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'porteiro@example.com',
        password: 'porteiro123456',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.user.role).toBe('CONCIERGE');
    expect(body.data.token).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });

  it('deve rejeitar login com senha incorreta', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'porteiro@example.com',
        password: 'senha_errada_aqui',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('deve retornar os dados do usuário autenticado no endpoint /me', async () => {
    // 1. Faz login como supervisor
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'supervisor@example.com',
        password: 'supervisor123456',
      },
    });

    const { token } = JSON.parse(loginRes.payload).data;

    // 2. Chama /me com o token
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const body = JSON.parse(meRes.payload);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe('supervisor@example.com');
    expect(body.data.user.role).toBe('SUPERVISOR');
  });

  it('deve bloquear o porteiro de listar usuários (RBAC: somente ADMIN e SUPERVISOR)', async () => {
    // 1. Faz login como porteiro
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'porteiro@example.com',
        password: 'porteiro123456',
      },
    });

    const { token } = JSON.parse(loginRes.payload).data;

    // 2. Tenta listar usuários
    const usersRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(usersRes.statusCode).toBe(403);
    const body = JSON.parse(usersRes.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('deve permitir que o supervisor liste os usuários da organização', async () => {
    // 1. Faz login como supervisor
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'supervisor@example.com',
        password: 'supervisor123456',
      },
    });

    const { token } = JSON.parse(loginRes.payload).data;

    // 2. Lista usuários
    const usersRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(usersRes.statusCode).toBe(200);
    const body = JSON.parse(usersRes.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.users)).toBe(true);
    expect(body.data.users.length).toBeGreaterThanOrEqual(3);
  });
});
