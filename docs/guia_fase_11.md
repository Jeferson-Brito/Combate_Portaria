# 🚀 GUIA DA FASE 11 — DEPLOY NO RENDER & BUILD MOBILE ANDROID/IOS

Este documento fornece as instruções completas para colocar o backend em produção no **Render.com** (com conexão persistente ao **Supabase**) e gerar os instaladores móveis (**APK/AAB** para Android e build para **iOS**) via **Expo EAS**.

---

## 1. Deploy do Servidor no Render.com

O projeto inclui os arquivos de Infraestrutura como Código prontos para deploy contínuo:
- `backend/render.yaml`: Blueprint declarativo com provisionamento de Persistent Disk.
- `backend/Dockerfile`: Build multi-stage leve baseado em Alpine Linux com execução sem privilégios de root (`USER node`).

### Passo a Passo para Deploy:
1. Conecte o repositório GitHub à sua conta do [Render.com](https://render.com).
2. Clique em **New** > **Blueprint** e selecione este repositório. O Render detectará automaticamente o arquivo [`render.yaml`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/Combate%20Portaria/backend/render.yaml).
3. Preencha as variáveis de ambiente necessárias no painel:
   - `DATABASE_URL`: URL de conexão do PostgreSQL Supabase (com connection pooling `pgbouncer`).
   - `DIRECT_URL`: URL direta do PostgreSQL Supabase para execução de migrations do Prisma.
   - `WHATSAPP_SESSION_PATH`: `/var/data/whatsapp_sessions` (montado no Persistent Disk de 1GB).
4. O Render executará o build e inicializará o serviço com suporte a reinicializações automáticas sem perda das credenciais do WhatsApp.

---

## 2. Geração de Builds Mobile (Expo EAS)

O aplicativo mobile utiliza o serviço em nuvem **Expo Application Services (EAS)** configurado no arquivo [`mobile/eas.json`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/Combate%20Portaria/mobile/eas.json).

### Pré-requisitos:
Instale o CLI do EAS globalmente ou utilize via `npx`:
```bash
npm install -g eas-cli
```

Faça login com sua conta Expo:
```bash
eas login
```

### 📱 Geração de APK Direto para Android (Instalação Imediata):
Para gerar um arquivo `.apk` pronto para instalar no smartphone ou tablet da portaria sem passar pela Google Play Store:
```bash
cd mobile
eas build --platform android --profile preview
```
Ao término do build, o EAS fornecerá um link de download direto e um QR Code para baixar o APK no celular.

### 📦 Geração de AAB para Google Play Store:
```bash
cd mobile
eas build --platform android --profile production
```

### 🍏 Geração de Build para iOS (TestFlight / App Store):
```bash
cd mobile
eas build --platform ios --profile production
```

---

## 3. URLs e Endpoints de Produção

No arquivo [`mobile/src/config/api.ts`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/Combate%20Portaria/mobile/src/config/api.ts), basta apontar a URL base para o seu domínio Render:
```typescript
export const API_URL = 'https://combate-portaria-backend.onrender.com/api/v1';
export const SOCKET_URL = 'https://combate-portaria-backend.onrender.com';
```
