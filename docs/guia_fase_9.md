# 📊 GUIA DA FASE 9 — RELATÓRIOS, AUDITORIA & MÉTRICAS

Este guia documenta o funcionamento e utilização dos módulos de métricas de portaria, relatórios filtráveis e trilha imutável de auditoria implementados na Fase 9.

---

## 1. Endpoints da API

### `GET /api/v1/reports/metrics?days=7`
Calcula as métricas operacionais consolidadas do condomínio/organização no período:
- **Tempo Médio de Resposta do Morador**: intervalo em segundos e minutos formatados desde a notificação no WhatsApp até a autorização/recusa.
- **Taxa de Aprovação**: percentual de aprovação (`autorizados / (autorizados + recusados) * 100`).
- **Tempo Médio de Permanência**: tempo médio entre o registro de entrada e saída.
- **Distribuição por Período**: contagem de acessos por turnos:
  - Manhã (06h - 12h)
  - Tarde (12h - 18h)
  - Noite (18h - 00h)
  - Madrugada (00h - 06h)
- **Top Destinos Mais Visitados**: unidades e apartamentos com maior fluxo.

### `GET /api/v1/reports/visits`
Relatório detalhado de visitas com filtros opcionais via query parameters:
- `startDate`: data inicial (ISO ou YYYY-MM-DD)
- `endDate`: data final
- `status`: status da visita (`PENDING`, `AUTHORIZED`, `DENIED`, `ENTERED`, `EXITED`)
- `visitorType`: tipo de visitante (`Visitante`, `Prestador`, `Entregador`, etc.)
- `destinationId`: ID da unidade específica

### `GET /api/v1/audit/timeline?limit=50`
Retorna a trilha cronológica imutável de eventos da portaria:
- `eventType`: `CREATED`, `WA_SENT`, `REMINDER_SENT`, `AUTHORIZED`, `DENIED`, `ENTRY_RECORDED`, `EXIT_RECORDED`, `CANCELLED`
- `actorType`: `USER` (porteiro/admin), `WHATSAPP_CLIENT` (morador) ou `SYSTEM`
- `metadata`: dados adicionais e observações registradas

---

## 2. Interface Mobile (Padrão Nubank)

A tela `ReportsScreen.tsx` foi construída com a identidade visual do **Nubank**:
1. **Header Roxo Nubank**: alternância entre **Desempenho** e **Auditoria**.
2. **Filtros por Período**: chips de seleção rápida (*Hoje*, *7 dias*, *30 dias*).
3. **Card Hero**: tempo médio de resposta no WhatsApp com destaque.
4. **Gráficos de Barras de Distribuição**: visualização rápida dos horários de pico da portaria.
5. **Ranking de Unidades**: lista das unidades mais acessadas.
6. **Timeline de Auditoria**: cartões de eventos com cores correspondentes e identificação do autor da ação.
