# Combate Portaria - Guia da FASE 6: Tempo Real & WebSocket

## Visão Geral da Fase 6

A **Fase 6** implementa a camada de comunicação em tempo real (**WebSocket via Socket.IO**) do sistema. O objetivo principal é garantir que a portaria e os administradores recebam atualizações instantâneas sobre autorizações, recusas, novos registros e mudanças de status do WhatsApp sem necessidade de recarregar a tela (pull-to-refresh).

---

## 1. Arquitetura em Tempo Real

A comunicação WebSocket é estruturada da seguinte forma:

```
[ Backend Fastify + Socket.IO Server ]
   ├── Sala 'org_{organizationId}' (Todos os porteiros da organização)
   └── Sala 'user_{userId}' (Notificações direcionadas)
          │
          │ WebSocket / Socket.IO
          ▼
[ Aplicativo Mobile React Native ]
   ├── RealtimeContext (Gerenciador de conexão e reconexão automática)
   ├── RealtimeAlertBanner (Banner flutuante de alerta sonoro/visual)
   ├── DashboardScreen (Atualização instantânea dos contadores)
   └── OpenRequestsScreen (Remoção e inclusão de cards em tempo real)
```

---

## 2. Eventos Transmitidos

| Evento | Origem | Destino | Descrição |
|---|---|---|---|
| `visit_request:created` | Backend (Criação de visita) | Sala `org_{orgId}` | Informa que uma nova solicitação foi aberta na portaria |
| `visit_request:updated` | Backend (WhatsApp / Porteiro) | Sala `org_{orgId}` | Notifica alteração de status (`AUTHORIZED`, `DENIED`, `CANCELLED`, etc.) |
| `notification:alert` | Backend (Decisão do morador) | Sala `org_{orgId}` | Dispara banner colorido e vibração no celular do porteiro |
| `whatsapp:status` | Backend (Baileys) | Sala `org_{orgId}` | Notifica mudanças de status de conexão e QR Code |

---

## 3. Resposta do Morador e Alerta Instantâneo

Quando o morador responde no WhatsApp ("1" para autorizar ou "2" para recusar):
1. O backend Baileys processa a mensagem e atualiza o banco de dados.
2. O `RealtimeService` despacha o evento `visit_request:updated` para atualizar a lista da portaria.
3. O `RealtimeService` despacha `notification:alert` de alta prioridade contendo:
   - **Autorizado**: Banner verde vibrante com o nome do visitante e morador.
   - **Recusado**: Banner vermelho de alerta impedindo a entrada.
4. O app mobile aciona a vibração no dispositivo (`Vibration.vibrate`) para chamar a atenção do operador.

---

## 4. Testes Automatizados (Fase 6)

A suíte `backend/src/modules/realtime/realtime.test.ts` valida:
- Conexão do cliente com o servidor Socket.IO na sala `org_{orgId}`.
- Recepção do evento `visit_request:created` ao registrar nova solicitação.
- Recepção do evento `visit_request:updated` e `notification:alert` com status `AUTHORIZED` quando o morador autoriza via WhatsApp.
- Recepção do evento `notification:alert` com status `DENIED` quando o morador recusa via WhatsApp.
