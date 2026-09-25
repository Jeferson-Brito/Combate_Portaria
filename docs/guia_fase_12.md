# 📦 Guia da Fase 12 - Encomendas na Portaria, WhatsApp Real & Build APK

Este guia documenta as novas funcionalidades integradas no **Combate Portaria Mobile** com visual estilo Nubank.

---

## 1. 📦 Módulo de Controle de Encomendas & Pacotes

### O que foi implementado:
1. **Banco de Dados (Prisma)**:
   - Tabela `Package` com suporte a transportadora (`carrier`), rastreio (`trackingCode`), unidade destinatária (`destinationId`), morador (`clientId`), status (`PENDING`, `PICKED_UP`, `RETURNED`) e código de retirada seguro (`pickupCode`).
2. **Backend Fastify**:
   - `POST /api/v1/packages`: Registra a encomenda, gera código único (`ENC-2026-XXXXXX`) e código de 4 dígitos (ex: `8492`), emitindo notificação automática para o WhatsApp do morador e WebSocket para a portaria.
   - `GET /api/v1/packages/pending`: Lista encomendas aguardando retirada.
   - `POST /api/v1/packages/:id/pickup`: Validação obrigatória do código de 4 dígitos para liberação do pacote.
   - `POST /api/v1/packages/:id/resend-code`: Reenvia o código ao morador via WhatsApp caso ele tenha perdido.
3. **Aplicativo Mobile**:
   - **Novo Atalho no Início**: Ícone circular 📦 com badge em tempo real de pacotes pendentes.
   - **Nova Aba na Barra Inferior**: Acesso instantâneo a "Encomendas".
   - **Modal de Recebimento**: Seleção rápida de apartamento/bloco, transportadora (Mercado Livre, Correios, Amazon, Shopee, etc.) e campos opcionais.
   - **Modal de Retirada Segura**: Digitação do código de 4 dígitos informado pelo morador na portaria para autorizar a entrega.

---

## 2. 💬 Conexão WhatsApp Real (Baileys Live)

1. No aplicativo, toque no atalho **WhatsApp** no carrossel de Início ou acerte em **Menu > Configurações**.
2. Toque no botão **"Iniciar Conexão"**.
3. O servidor gerará o **QR Code** de emparelhamento do Baileys.
4. No seu celular físico:
   - Abra o **WhatsApp**.
   - Vá em **Aparelhos Conectados** > **Conectar um aparelho**.
   - Aponte a câmera para o QR Code na tela.
5. Pronto! O status mudará para `CONECTADO` e todas as mensagens de visitas e encomendas serão disparadas pelo seu WhatsApp real.

---

## 3. 🤖 Gerando o Arquivo APK (.apk) para Android

O projeto já está configurado no arquivo `mobile/eas.json` com o perfil de build `preview` apontando para o tipo `apk`.

### Passo a passo para gerar o instalador APK:

1. Abra um terminal na pasta `mobile`:
   ```bash
   cd mobile
   ```

2. Se ainda não possui login no Expo, execute:
   ```bash
   npx eas login
   ```
   *(Crie uma conta gratuita em [expo.dev](https://expo.dev) caso não tenha)*

3. Dispare a compilação do APK na nuvem do Expo:
   ```bash
   npx eas build -p android --profile preview
   ```

4. O Expo compilará o aplicativo e fornecerá no final:
   - Um link direto para download do arquivo `.apk`.
   - Um QR Code no terminal para você escanear com a câmera do celular e baixar o aplicativo diretamente no aparelho.
