# 🛡️ GUIA DA FASE 10 — SEGURANÇA, TESTES E2E & RESILIÊNCIA

A Fase 10 assegura que o sistema é resiliente contra condições de corrida, concorrência simultânea entre múltiplos porteiros, falhas de conectividade e garante 100% de conformidade com as regras de negócio.

---

## 1. Tratamento de Concorrência & Idempotência

1. **Mensagens Tardias do WhatsApp**:
   - Se o morador autorizar ("1") e depois mandar qualquer outra mensagem ("2", "não", "sim"), o backend valida a transição de estado da máquina: caso o status já não seja `PENDING`, a mensagem adicional não altera a decisão tomada.
2. **Prevenção de Entrada Duplicada**:
   - Um porteiro não consegue registrar entrada física duas vezes para a mesma solicitação. Apenas solicitações com status `AUTHORIZED` podem transitar para `ENTERED`.
3. **Prevenção de Saída Duplicada**:
   - Apenas visitantes com status `ENTERED` podem ter saída registrada (`EXITED`).
4. **Rate Limiting Operacional**:
   - Limite de até 3 lembretes de cobrança no WhatsApp por solicitação para evitar bloqueios de spam do número da portaria.

---

## 2. Suíte de Testes Automatizados

O sistema conta com **10 suítes de testes** automatizadas e **67 testes unitários e de integração E2E**, todos executados via **Vitest**:

```bash
# Executar todos os testes do backend
cd backend
npx vitest run
```

### Arquivos de Testes do Projeto:
| Módulo | Arquivo de Teste | Cobertura |
| :--- | :--- | :--- |
| **Auth & RBAC** | `auth.test.ts` | Login, JWT, permissões por cargo |
| **Clientes & Destinos** | `clients-destinations.test.ts` | E.164, busca rápida, vínculos N:N |
| **Visitantes & Veículos** | `visitors.test.ts` | Busca por placa/CPF, fotos |
| **Solicitações** | `visit-requests.test.ts` | Criação, listagem pendentes, timers |
| **WhatsApp Baileys** | `whatsapp.test.ts` | QR Code, envio, parsing de respostas |
| **Realtime** | `realtime.test.ts` | Socket.IO, salas por tenant |
| **Pré-Autorizações** | `pre-authorizations.test.ts` | Agendamentos, check-in |
| **Entrada e Saída** | `entry-exit.test.ts` | Presentes, bloqueio de duplicados |
| **Relatórios & Auditoria**| `reports.test.ts` | Tempo médio, distribuição, logs |
| **Ciclo Completo E2E** | `access-control-lifecycle.e2e.test.ts` | Ciclo ponta a ponta sem interrupção |
