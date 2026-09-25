# Combate Portaria - Guia da FASE 7: Pré-Autorização

## Visão Geral da Fase 7

A **Fase 7** implementa a funcionalidade de **Pré-Autorização**, permitindo que moradores avisem com antecedência sobre visitas programadas (ex: familiares, prestadores de serviço, técnicos, entregadores agendados).

Quando o visitante chega na portaria, o porteiro localiza a pré-autorização na lista do dia e, com um único toque em **"Liberar Entrada Imediata"**, o sistema valida o acesso, gera a solicitação com status `AUTHORIZED` e registra os eventos na auditoria, **sem necessidade de aguardar confirmação do morador pelo WhatsApp**, pois a autorização já havia sido concedida previamente.

---

## 1. Fluxo Operacional da Pré-Autorização

```
[ Morador comunica visita antecipada ]
                │
                ▼
[ Cadastro de Pré-Autorização ]
   - Morador / Unidade Destino
   - Nome do Visitante e Documento (opcional)
   - Empresa (opcional) e Tipo de Acesso
   - Data e Faixa de Horário Previsto ("14:00 às 18:00")
   - Observações
                │
                ▼
[ Visitante chega à Portaria ]
   - Porteiro consulta aba "Pré-Autorizados" ou busca por nome/empresa
   - Sistema exibe o card dourado com badge "PRÉ-AUTORIZADO"
                │
                ▼
[ Check-in com 1 Toque: "LIBERAR ENTRADA IMEDIATA" ]
   - Opcionalmente vincula foto do visitante ou placa do veículo
   - Marca pré-autorização como isUsed = true (impede reuso indevido)
   - Cria a VisitRequest já no estado AUTHORIZED
   - Registra eventos de auditoria na timeline
   - Notifica a portaria em tempo real via WebSocket
```

---

## 2. Endpoints da API (Fase 7)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/pre-authorizations` | Cadastra nova pré-autorização com datas e horários |
| `GET` | `/api/v1/pre-authorizations/today` | Lista pré-autorizações válidas hoje com filtro `?q=busca` |
| `GET` | `/api/v1/pre-authorizations` | Listagem geral com paginação e filtro `isUsed` |
| `GET` | `/api/v1/pre-authorizations/:id` | Detalhes da pré-autorização |
| `POST` | `/api/v1/pre-authorizations/:id/checkin` | Efetiva a entrada imediata na portaria com liberação instantânea |
| `DELETE` | `/api/v1/pre-authorizations/:id` | Cancela/exclui uma pré-autorização não utilizada |

---

## 3. Interface Mobile

- **`PreAuthorizationsScreen.tsx`**: Tela com busca rápida por texto, cartões detalhados das visitas agendadas para o dia e botão verde de liberação instantânea.
- **`NewPreAuthorizationModal.tsx`**: Modal completo com autocomplete de unidades e moradores, tipo de visitante e faixa de horários.
- **Integração no Dashboard**: Nova aba **"Pré-Autorizados"** inserida na navegação superior.
