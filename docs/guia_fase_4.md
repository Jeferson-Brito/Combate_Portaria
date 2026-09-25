# Guia de Execução — FASE 4 (Concluída)

A **Fase 4 (Solicitações de Acesso, Máquina de Estados e Dashboard)** foi implementada e testada com sucesso:

- **Máquina de Estados & Identificador Sequencial (Seção 16 e 17)**:
  - Geração automática de identificador amigável único: `REQ-2026-000001`.
  - Estados: `PENDING`, `AUTHORIZED`, `DENIED`, `EXPIRED`, `CANCELLED`, `ENTERED`, `EXITED`, `FAILED`.
  - Cada transição gera um evento imutável na tabela `visit_events` (audit trail completa).
- **Tela de Confirmação & Resumo Pré-Envio (Seção 15)**:
  - O modal `NewRequestModal.tsx` exibe os dados do cliente, destino, visitante e veículo em resumo antes de disparar para o WhatsApp.
- **Solicitações em Aberto com Timer do Servidor (Seções 24 e 25)**:
  - `GET /api/v1/visit-requests/pending` lista todas as solicitações pendentes da portaria.
  - O cálculo de tempo de espera (`waitingTimeFormatted`) é baseado no relógio do servidor, imune a adulterações ou descompassos do relógio do celular.
- **Reenvio de Mensagens com Limite de Lembretes (Seção 26)**:
  - `POST /api/v1/visit-requests/:id/remind`: incrementa o contador `remindersSentCount` e registra o evento na timeline.
  - Regra de limite configurável aplicada: após 3 lembretes, bloqueia com status HTTP 429 (`MAX_REMINDERS_EXCEEDED`) para evitar spam ao morador.
- **Contingência e Autorização Manual**:
  - `POST /api/v1/visit-requests/:id/authorize-manual` permite liberar o acesso se o morador autorizou por interfone ou ligação convencional.
- **Histórico Completo Filtrável (Seção 28 e 29)**:
  - `GET /api/v1/visit-requests/history` com filtros por status, datas, cliente, visitante e busca livre.
  - `GET /api/v1/visit-requests/:id` retorna os detalhes com a timeline completa dos eventos.

---

## Testes Automatizados da Fase 4:
Executados via Vitest com **30 testes passando** (100% de sucesso):
```bash
npm test
```
