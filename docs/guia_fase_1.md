# Guia de Execução — FASE 1 (Concluída)

A **Fase 1 (Fundação)** do projeto foi concluída com sucesso:
- **Banco de Dados Local**: SQLite (`backend/prisma/dev.db`) com todas as tabelas criadas via migration `20260924182142_init`.
- **Preparado para Supabase**: Criado `backend/prisma/schema.postgresql.prisma` com tipos UUID e timestamptz nativos do PostgreSQL.
- **Preparado para Render**: Criados `backend/render.yaml` e `backend/Dockerfile` multi-stage com persistent disk para credenciais do Baileys e healthcheck em `/health`.
- **Autenticação & RBAC**: Tokens JWT (Access + Refresh), hash seguro de senhas com Bcrypt (salt 12) e perfis CONCIERGE, SUPERVISOR e ADMIN.
- **Seed Inicial Populado**:
  - **Organização**: `Residencial Exemplo`
  - **Admin**: `admin@example.com` | Senha: `admin123456`
  - **Supervisor**: `supervisor@example.com` | Senha: `supervisor123456`
  - **Porteiro**: `porteiro@example.com` | Senha: `porteiro123456`
  - **Destinos & Clientes**: Apt 1 (João Silva), Apt 2 (Maria Silva), Apt 8 (Carlos Souza)
  - **Visitante & Veículo**: Carlos Eduardo Santos | Honda Civic Prata (ABC1D23)
- **Mobile (React Native / Expo)**:
  - Telas criadas: `LoginScreen.tsx` e `DashboardScreen.tsx`
  - Design system dark mode com paleta oficial de status (🟡 Pendente, 🟢 Autorizado, 🔴 Recusado, 🔵 Presente, ⚪ Expirado)
  - Botões ergonômicos e atalhos rápidos de preenchimento de teste

---

## Como Rodar o Servidor Localmente:

```bash
cd backend
npm run dev
```

O servidor iniciará em `http://localhost:3333`.
Você pode testar a rota de saúde em `http://localhost:3333/health`.

## Como Rodar os Testes Automatizados:

```bash
cd backend
npm test
```

## Como Iniciar o Aplicativo Mobile:

```bash
cd mobile
npm install
npm start
```
