# Combate Portaria - Guia da FASE 5: WhatsApp & Baileys

## Visão Geral da Fase 5

A **Fase 5** implementa a espinha dorsal de comunicação do sistema: o envio de notificações em tempo hábil para os moradores/clientes via **WhatsApp** e o processamento automatizado de suas respostas ("1" para autorizar, "2" para recusar).

Toda a conexão do WhatsApp utiliza **Baileys** (`@whiskeysockets/baileys`) executando **estritamente no backend**, preservando a bateria do celular do porteiro, garantindo reconexão automática e persistência em disco.

---

## 1. Arquitetura do Provedor de WhatsApp

Implementado sob o padrão **Adapter/Provider**:
- `IWhatsAppProvider`: Interface desacoplada para conexão, desconexão, envio de solicitações, envio de lembretes e escuta de mensagens recebidas.
- `BaileysProvider`: Implementação real utilizando `@whiskeysockets/baileys`, multi-file auth state com persistência em disco por organização (`WHATSAPP_SESSION_PATH/org_{organizationId}`) e emissão de QR Code em formato Base64.
- `MockWhatsAppProvider`: Implementação em memória para testes unitários, testes de integração e simulação contínua sem depender de número de telefone real.

---

## 2. Fluxo de Envio e Template Dinâmico

Ao registrar uma visita na portaria:
1. O backend gera o código amigável (`REQ-2026-000001`).
2. O serviço `WhatsAppService` compila o template com as variáveis:
   - `{{cliente}}`: Nome do morador
   - `{{visitante}}`: Nome do visitante
   - `{{empresa}}`: Empresa (se houver)
   - `{{tipo}}`: VISITANTE, PRESTADOR, ENTREGADOR
   - `{{motivo}}`: Motivo da visita
   - `{{veiculo}}`: Modelo e placa (se houver)
   - `{{codigo}}`: Código da solicitação
   - `{{horario}}`: Horário de chegada
3. Envia mensagem via WhatsApp com as opções:
   - Digite **1** para **AUTORIZAR**
   - Digite **2** para **RECUSAR**
4. Cria o evento `WA_SENT` na timeline auditável da solicitação.

---

## 3. Fluxo de Recebimento e Resposta do Morador

Quando o morador responde no WhatsApp:
1. O webhook do Baileys recebe a mensagem e aciona `whatsappService.handleIncomingResponse()`.
2. O sistema limpa o número e localiza o cliente cadastrado na organização.
3. Busca a solicitação com status `PENDING` mais recente daquele cliente.
4. Identifica a intenção:
   - **Autorizar**: `1`, `SIM`, `AUTORIZAR`, `PODE ENTRAR`, `LIBERADO`, `LIBERAR` $\rightarrow$ status atualizado para `AUTHORIZED`.
   - **Recusar**: `2`, `NAO`, `NÃO`, `RECUSAR`, `NEGAR` $\rightarrow$ status atualizado para `DENIED`.
5. Preenche `answeredAt`, gera evento `WA_RECEIVED` na timeline e despacha evento em tempo real via WebSocket.

---

## 4. Endpoints Disponíveis

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/whatsapp/status` | Retorna status da conexão e QR Code (se pendente) |
| `POST` | `/api/v1/whatsapp/connect` | Inicia a sessão e gera QR Code |
| `POST` | `/api/v1/whatsapp/disconnect` | Encerra a sessão do Baileys |
| `POST` | `/api/v1/whatsapp/simulate-incoming` | Simula resposta de morador (essencial para testes) |
| `GET` | `/api/v1/whatsapp/templates` | Lista os templates de mensagens da organização |
| `PUT` | `/api/v1/whatsapp/templates` | Atualiza o texto e variáveis dos templates |

---

## 5. Interface Mobile (Portaria & Admin)

A tela `WhatsAppConfigScreen.tsx` foi integrada diretamente no Dashboard:
1. **Status em Tempo Real**: Badge visual (Conectado / Aguardando QR Code / Conectando / Desconectado).
2. **Leitor de QR Code**: Exibe imagem do QR Code gerada pelo Baileys para pareamento rápido com o celular da portaria.
3. **Simulador de Resposta**: Permite selecionar qualquer solicitação em aberto e com um toque simular a resposta do morador ("1" ou "2"), atualizando o status imediatamente.
