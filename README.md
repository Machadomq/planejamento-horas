# Planejamento de horas dos devs — React

Implementação em React das três telas: Gantt de horas, fila de tickets aprovados e modal de planejamento.

## Rodar

```bash
npm install
npm run dev
```

Sem dependências além de React + Vite. Estilos são objetos inline a partir de `src/theme.js` — trocar pelos tokens/CSS do codebase se houver.

## Estrutura

```
src/
  App.jsx                  estado do fluxo: fila → modal → Gantt
  theme.js                 tokens de cor, tipografia, status, prioridades
  lib/capacidade.js        TODA a regra de capacidade (pesos, carga, ocupação, conflitos, validação)
  lib/formato.js           moeda, data, horas
  components/ui.jsx        Chip, Checkbox, Stepper, Barra, Avatar, Modal
  data/mock.js             dados no formato do contrato de API
  screens/GanttHoras.jsx
  screens/TicketsAPlanejar.jsx
  screens/PlanejarDemanda.jsx
```

## Fluxo implementado

1. Gantt → botão **Tickets a planejar** abre a fila.
2. Fila lista só `statusOrcamento === 'aprovado' && !alocacaoId`; seleção múltipla.
3. **Planejar no Gantt** abre o modal por ticket, em sequência.
4. Confirmar cria a alocação, marca o ticket como planejado e a barra aparece no Gantt.
5. No Gantt: selecionar uma barra abre a faixa de edição (horas ±, status); clicar nas células da linha selecionada remarca a janela (1º clique = início, 2º = fim).

## Ligar na API

Contrato HTTP em `API_SPEC.md`; modelo de dados do Postgres por trás dele (tabelas, turnos manhã/tarde de 4h, constraints que impedem sobreposição) em `DATABASE_SCHEMA.md`.

Trocar `src/data/mock.js` por chamadas reais (ver `API_SPEC.md`):

| Onde | Endpoint |
|---|---|
| `App.jsx` boot | `GET /planejamento/gantt?de=&ate=` |
| `TicketsAPlanejar` | `GET /planejamento/tickets-aprovados` |
| `patch()` em `App.jsx` | `PATCH /planejamento/alocacoes/:id` |
| `confirmar()` em `App.jsx` | `POST /planejamento/alocacoes` |

`patch` e `confirmar` já são otimistas: atualizam o estado local na hora. Adicionar rollback + toast no `catch`, e tratar **422 `capacidade_excedida`** (reabrir o modal com o alerta vermelho) e **409** (recarregar e avisar que outra pessoa alterou).

## Onde mexer

- Regra de negócio de capacidade: só em `lib/capacidade.js`. As três telas leem de lá, então nada divirja. É o arquivo a cobrir com teste unitário.
- Nada de total pré-calculado no estado: KPIs, heatmap, conflitos e alertas saem de `useMemo` sobre `devs` + `alocacoes`.
- `capacidade.porBucket` permite férias/feriados/alocação parcial; hoje o mock manda 10 h em todas as semanas.

## Pendente

- Drag & drop das barras (a remarcação por clique deve continuar existindo para teclado).
- Escalas Dia/Mês: o toggle existe, só a granularidade semanal está implementada.
- Paginação e busca na fila, permissões, histórico de replanejamento.
- Distribuição `manual` cai no linear até existir o input de peso por semana.
- Responsivo: as telas assumem largura de desktop (≥ 1440 px), como nos protótipos.
