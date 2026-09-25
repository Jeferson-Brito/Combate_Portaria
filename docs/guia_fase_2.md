# Guia de Execução — FASE 2 (Concluída)

A **Fase 2 (Clientes & Destinos / Unidades)** foi implementada e testada com sucesso:
- **Conceito Genérico e Aberto**: O sistema atende tanto residenciais (Apartamentos/Blocos) quanto empresas (Salas/Setores) e clínicas (Consultórios).
- **Validação E.164 de WhatsApp**: Sanitização e padronização automática com DDI internacional (`5511999998888`), rejeitando números incompletos ou sem DDD.
- **Relacionamento N:N Multi-Unidades**: Clientes podem ser associados a múltiplas unidades/destinos.
- **Busca Rápida de Portaria (Autocomplete)**:
  - O porteiro digita `8` e localiza instantaneamente o *Apartamento 8 — Carlos Souza*.
  - O porteiro digita `João` e localiza o *Apartamento 1 — João Silva*.
  - O porteiro digita o código `CONS-10` e localiza o *Consultório 10*.
  - Suporte à busca por nome, telefone, empresa, documento ou unidade.
- **Controle RBAC Rigoroso**:
  - Porteiros: Leitura e busca rápida garantida; bloqueados de criar/excluir clientes ou destinos (HTTP 403 Forbidden).
  - Supervisores e Administradores: Permissão total de CRUD e soft-delete.
- **Componente Mobile**:
  - `mobile/src/components/ClientAutocomplete.tsx`: Busca instantânea com debounce de 250ms, seleção em 1 toque e design dark ergonômico.

---

## Testes Automatizados da Fase 2:
Executados via Vitest com **16 testes passando** (100% de sucesso):
```bash
npm test
```
