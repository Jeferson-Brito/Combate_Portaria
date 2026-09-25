# Combate Portaria - Guia da FASE 8: Entrada e Saída / Visitantes Presentes

## Visão Geral da Fase 8

A **Fase 8** implementa o ciclo completo de controle de presença física dos visitantes no condomínio/empresa (especificado nas **Seções 29 e 30** de `Ideia do projeto.txt`):
1. **Registro de Entrada (`AUTHORIZED` $\rightarrow$ `ENTERED`)**: Quando o visitante passa pelo portão/catraca física após aprovação do morador ou pré-autorização.
2. **Tela de Visitantes Presentes (`GET /visit-requests/present`)**: Painel ao vivo que lista com precisão quem está dentro das dependências no momento, com contador de tempo de permanência calculado no servidor.
3. **Registro de Saída (`ENTERED` $\rightarrow$ `EXITED`)**: Registra o momento exato em que o visitante deixa o local, calculando a duração total da permanência e arquivando na timeline de auditoria.

---

## 1. Fluxo do Ciclo de Vida da Presença Física

```
[ Solicitação AUTORIZADA ] (Via WhatsApp, Pré-Auto ou Interfone)
               │
               ▼
[ 🟢 Registrar Entrada ]
   - Altera status para ENTERED
   - Grava entryAt (timestamp do servidor)
   - Adiciona evento ENTRY_RECORDED na timeline
   - Emite WebSocket 'visit_request:updated'
   - Dispara alerta sonoro e visual para a portaria
               │
               ▼
[ 👥 Visitantes Presentes no Local ]
   - Exibido na aba "Presentes" do aplicativo
   - Mostra: Visitante, Unidade, Cliente, Veículo, Porteiro e Foto
   - Relógio de permanência atualizado em tempo real ("Presente há 1h 25m")
   - Busca instantânea por nome, documento, placa ou destino
               │
               ▼
[ 🔴 Registrar Saída (1 Toque) ]
   - Confirmação com exibição do tempo total no local
   - Altera status para EXITED
   - Grava exitAt e calcula permanência em minutos
   - Adiciona evento EXIT_RECORDED na timeline
   - Remove do painel de presentes e sincroniza todos os porteiros
```

---

## 2. Endpoints da API (Fase 8)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/v1/visit-requests/:id/entry` | Registra a entrada física (`AUTHORIZED` $\rightarrow$ `ENTERED`), salva `entryAt` e gera evento de auditoria |
| `POST` | `/api/v1/visit-requests/:id/exit` | Registra a saída física (`ENTERED` $\rightarrow$ `EXITED`), salva `exitAt` e calcula duração total |
| `GET` | `/api/v1/visit-requests/present` | Lista todos os visitantes presentes (`ENTERED`) com busca `?q=nome/placa` e `stayDurationFormatted` |
| `GET` | `/api/v1/visit-requests/:id` | Detalhes com timeline cronológica completa de todos os eventos da visita |

---

## 3. Interfaces Mobile Implementadas

- **[`PresentVisitorsScreen.tsx`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/Combate%20Portaria/mobile/src/screens/concierge/PresentVisitorsScreen.tsx)**:
  - Contador no cabeçalho com o total de pessoas dentro do local.
  - Barra de busca dinâmica por nome, CPF/RG, empresa, unidade ou placa.
  - Cartões com foto do visitante, dados do morador/unidade, placa e modelo do veículo, além do horário de entrada.
  - Badge dinâmico de permanência com atualização periódica a cada 10 segundos.
  - Botão vermelho de ação rápida **"Registrar Saída"** com confirmação e cálculo prévio da estadia.
- **[`OpenRequestsScreen.tsx`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/Combate%20Portaria/mobile/src/screens/concierge/OpenRequestsScreen.tsx)**:
  - Diálogo de contingência atualizado: ao autorizar manualmente uma visita, o porteiro pode optar por **"Registrar Entrada Agora"** diretamente com um toque.
- **[`DashboardScreen.tsx`](file:///c:/Users/jefersonbrito/Documents/Grupo%20Combate/Combate%20Portaria/mobile/src/screens/concierge/DashboardScreen.tsx)**:
  - Navegação por abas: `Geral`, `Aberto (X)`, `Presentes (Y)`, `Pré-Auto` e `WhatsApp`.
  - Toque no card de métricas "Visitantes Presentes" abre instantaneamente a lista de presentes.

---

## 4. Testes Automatizados (Vitest)

O módulo de controle de entrada e saída foi coberto com 6 testes automatizados dedicados em `entry-exit.test.ts`:
1. `deve registrar entrada física do visitante no local (AUTHORIZED -> ENTERED)`
2. `deve listar o visitante na lista de presentes no local (GET /present)`
3. `deve permitir buscar visitantes presentes por nome ou placa`
4. `deve registrar a saída do visitante (ENTERED -> EXITED) e calcular permanência`
5. `não deve permitir registrar entrada de visita com status incompatível`
6. `não deve permitir registrar saída de quem não está presente`

Todos os **53 testes** do backend (8 arquivos de teste) foram executados e aprovados com sucesso.
