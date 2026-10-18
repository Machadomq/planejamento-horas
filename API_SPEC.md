# Contrato de API — Planejamento de horas dos devs

Documento de referência para implementar as três telas (fila de tickets aprovados, modal de planejamento, Gantt de horas). Descreve **o que cada tela precisa buscar**, o formato esperado, as mutações e as regras que ficam no back-end.

Convenções: JSON, `camelCase`, datas em ISO‑8601 (`2026-09-18`), timestamps com timezone (`2026-09-18T14:32:00-03:00`), valores monetários em **centavos** (`2160000` = R$ 21.600,00), horas em **múltiplos de 4** (`4`, `8`, `12`, `16`…) — ver regra de turnos abaixo.

Modelo de dados do back-end (tabelas, turnos manhã/tarde, constraints): ver `DATABASE_SCHEMA.md`. Este documento descreve o contrato HTTP; aquele descreve como o Postgres garante as regras aqui listadas.

---

## 1. Endpoints por tela

| Tela | Chamada | Quando |
|---|---|---|
| Fila de tickets | `GET /planejamento/tickets-aprovados` | ao abrir o modal, ao trocar filtro/ordenação (ou filtrar no cliente) |
| Gantt | `GET /planejamento/gantt` | ao abrir a tela e ao trocar período/squad |
| Modal de planejamento | `GET /planejamento/capacidade?devIds=&de=&ate=` | ao abrir o modal (pode vir do payload do Gantt) |
| Modal → salvar | `POST /planejamento/alocacoes` | CTA "Planejar demanda" |
| Gantt → editar barra | `PATCH /planejamento/alocacoes/{id}` | stepper de horas, troca de status, remarcação da janela |
| Auxiliares | `GET /devs`, `GET /catalogos/planejamento` | no boot da tela |

---

## 2. `GET /planejamento/gantt`

Carrega a tela inteira do Gantt em uma chamada. O front **não** deve precisar de N+1 requisições por dev.

**Query**

| Param | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `de` | date | sim | primeira segunda-feira do horizonte (`2026-08-31`) |
| `ate` | date | sim | último dia do horizonte (`2026-11-22`) |
| `escala` | enum | não | `dia` \| `semana` \| `mes` (padrão `semana`) |
| `squadId` | string | não | filtro de squad |
| `devIds` | string[] | não | filtro de devs |
| `tipos` | string[] | não | tipo de demanda |
| `status` | string[] | não | status da demanda |

**Resposta**

```json
{
  "periodo": {
    "de": "2026-08-31",
    "ate": "2026-11-22",
    "escala": "semana",
    "semanaAtualIndice": 2,
    "buckets": [
      { "indice": 0, "id": "S36", "inicio": "2026-08-31", "fim": "2026-09-06" },
      { "indice": 1, "id": "S37", "inicio": "2026-09-07", "fim": "2026-09-13" }
    ]
  },
  "devs": [
    {
      "id": "usr_112",
      "nome": "Ana Ribeiro",
      "iniciais": "AR",
      "papel": "Backend · Fiscal",
      "capacidade": {
        "horasSemana": 10,
        "horasPeriodo": 120,
        "porBucket": [10, 10, 10, 6, 10, 10, 10, 10, 10, 10, 10, 4]
      }
    }
  ],
  "alocacoes": [
    {
      "id": "alc_9001",
      "ticketId": "TCK-4187",
      "titulo": "Integração fiscal · NF-e lote 2",
      "tipo": "Projeto",
      "devId": "usr_112",
      "bucketInicio": 0,
      "duracaoBuckets": 9,
      "horasEstimadas": 64,
      "horasApontadas": 64,
      "distribuicao": "linear",
      "pesos": null,
      "status": "risco",
      "prioridade": "Alta",
      "dependeDe": ["TCK-4102"],
      "atualizadoEm": "2026-09-15T10:04:00-03:00"
    }
  ]
}
```

**Notas**
- `capacidade.porBucket` é o que permite refletir férias, feriados e alocação parcial. Se o back não tiver isso ainda, devolva `horasSemana` repetido — o front sempre lê `porBucket`. No back, cada valor de `porBucket` é derivado somando os turnos (`manha`/`tarde`, 4h cada) disponíveis naquele dia — ver a view `capacidade_slots` em `DATABASE_SCHEMA.md` §5. Um dia com só a tarde livre (folga de meio período) entra como `4`, não `8` nem `0`.
- `bucketInicio`/`duracaoBuckets` são índices do array `buckets`. Alternativa aceitável: `dataInicio`/`dataFim` em ISO e o front converte. **Escolher uma das duas e manter** — misturar as duas gera erro de off-by-one.
- `horasApontadas` alimenta a barra de progresso interna da barra do Gantt.
- `semanaAtualIndice` evita que o front calcule a semana corrente com fuso diferente do servidor.
- Se `escala` for `dia` ou `mes`, apenas os `buckets` mudam de granularidade; o resto do contrato é idêntico.

### Campos derivados no front (não enviar)
Estes são calculados na tela e **não** devem vir da API, para não divergir:
carga semanal por dev, % de ocupação, cor do heatmap, KPIs do topo, lista de conflitos, alertas do modal.

Fórmulas:
```
cargaBucket(dev, b) = Σ alocações do dev que cobrem b de (horasEstimadas × peso(b))
peso(b)             = linear: 1/duracao | frontLoaded: (n-i)/Σ | manual: pesos[i]
ocupacao(dev, b)    = cargaBucket / capacidade.porBucket[b]
```
Faixas: `≤ 0,80` verde · `0,80–1,00` âmbar · `> 1,00` vermelho.

---

## 3. `GET /planejamento/tickets-aprovados`

Fila da tela 1. **Regra de negócio no back-end, não no front:** só retornar tickets com orçamento aprovado e ainda não alocados.

```
statusOrcamento = 'aprovado' AND alocacaoId IS NULL AND cancelado = false
```

**Query**: `squadId`, `ordenarPor` (`prazo` \| `horas` \| `aprovacao`), `busca` (id, título, solicitante, área), `pagina`, `porPagina`.

**Resposta**

```json
{
  "itens": [
    {
      "id": "TCK-4312",
      "titulo": "Migração do apontamento móvel — fase 1",
      "tipo": "Projeto",
      "prioridade": "Alta",
      "solicitante": { "id": "usr_401", "nome": "Marina Duarte", "area": "Operações" },
      "orcamento": {
        "horasAprovadas": 48,
        "valorAprovadoCentavos": 2160000,
        "aprovadoEm": "2026-09-15T09:12:00-03:00",
        "aprovadoPor": "Rogério Pinto",
        "propostaId": "ORC-2291"
      },
      "prazoAcordado": "2026-10-30",
      "diasParaPrazo": 42,
      "moduloId": "apontamentos",
      "dependeDe": ["TCK-4102"]
    }
  ],
  "totais": {
    "tickets": 8,
    "horasAprovadas": 292,
    "valorAprovadoCentavos": 13140000,
    "comPrazoAte10Dias": 2
  },
  "pagina": 1,
  "porPagina": 25,
  "total": 8
}
```

**Notas**
- `totais` deve refletir a **fila inteira**, não a página — os cartões de resumo do topo somam tudo.
- `diasParaPrazo` calculado no servidor (referência de data única, evita divergência de fuso). Negativo = atrasado.
- `propostaId` / `aprovadoPor` aparecem no detalhe e na trilha de auditoria.

---

## 4. `GET /planejamento/capacidade`

Usado pelo modal quando ele é aberto fora do Gantt (deep link, notificação). Mesma estrutura de `devs` + `alocacoes` do Gantt, restrita aos devs pedidos.

**Query**: `devIds` (vazio = squad inteiro), `de`, `ate`.

```json
{
  "periodo": { "de": "2026-08-31", "ate": "2026-11-22", "buckets": [] },
  "devs": [
    {
      "id": "usr_116",
      "nome": "Eduarda Lima",
      "iniciais": "EL",
      "papel": "QA · Automação",
      "capacidade": { "horasSemana": 10, "porBucket": [] },
      "cargaAtualPorBucket": [7.1, 7.1, 7.1, 7.1, 7.1, 7.1, 7.1, 9.0, 9.0, 9.0, 9.0, 9.0]
    }
  ]
}
```

`cargaAtualPorBucket` é opcional (o front consegue derivar das alocações), mas ajuda quando o modal não carrega a lista completa de demandas.

---

## 5. `POST /planejamento/alocacoes` — criar o planejamento

Corpo enviado pelo CTA do modal.

```json
{
  "ticketId": "TCK-4312",
  "devId": "usr_116",
  "bucketInicio": 4,
  "duracaoBuckets": 5,
  "horasEstimadas": 48,
  "distribuicao": "frontLoaded",
  "pesos": null,
  "tipo": "Projeto",
  "prioridade": "Alta",
  "status": "planejada",
  "dependeDe": ["TCK-4102"],
  "notificarEnvolvidos": true,
  "confirmarEstouro": false,
  "idempotencyKey": "b0f1…"
}
```

- `horasEstimadas` deve ser múltiplo de 4 e no mínimo 4. O back-end quebra esse total em turnos de 4h (`manha`/`tarde`) dentro da janela `bucketInicio`/`duracaoBuckets` e grava um `planejamento_slots` por turno (`DATABASE_SCHEMA.md` §4) — é isso que impede duas demandas ocuparem o mesmo turno da mesma pessoa.
- `distribuicao: "manual"` exige `pesos: number[]` com `duracaoBuckets` itens somando 1 (tolerância 0,001).
- `confirmarEstouro`: o modal só envia `true` depois de o usuário clicar em "Planejar mesmo com estouro". Sem isso, o back **deve recusar** planejamentos que estouram capacidade.
- `idempotencyKey` protege contra duplo clique.

**201** devolve a alocação criada (mesmo shape do array `alocacoes`) e o ticket atualizado (`alocacaoId` preenchido, sai da fila).

**422 — estouro de capacidade** (o front transforma isso no alerta vermelho):

```json
{
  "erro": "capacidade_excedida",
  "mensagem": "Eduarda Lima excede a capacidade em 2 semanas.",
  "detalhes": [
    { "bucketId": "S41", "capacidadeHoras": 10, "cargaHoras": 13.6, "ocupacao": 1.36 },
    { "bucketId": "S42", "capacidadeHoras": 10, "cargaHoras": 12.1, "ocupacao": 1.21 }
  ],
  "podeConfirmar": true
}
```

**409** — ticket já alocado por outro usuário. O front recarrega a fila e avisa.

### Planejamento em lote
O CTA "Planejar N tickets no Gantt" precisa de:

`POST /planejamento/alocacoes/lote` → `{ "itens": [ …mesmo corpo… ], "confirmarEstouro": false }`

Resposta parcial permitida: `{ "criadas": [], "recusadas": [ { "ticketId", "erro", "detalhes" } ] }`.

---

## 6. `PATCH /planejamento/alocacoes/{id}` — editar no Gantt

Aceita qualquer subconjunto. Usado pelo stepper de horas, chips de status e remarcação de janela.

```json
{
  "bucketInicio": 5,
  "duracaoBuckets": 4,
  "horasEstimadas": 52,
  "status": "monitorada",
  "devId": "usr_113",
  "confirmarEstouro": false,
  "versao": 7
}
```

- `versao` (ou `If-Match` com ETag) para concorrência otimista: dois PMs mexendo na mesma grade devem receber **409** em vez de sobrescrever.
- Mesmo **422** de capacidade do POST.
- Mudar `devId` = mover a barra entre linhas do Gantt (útil quando o drag & drop entrar).

**Outras mutações**
- `DELETE /planejamento/alocacoes/{id}` — desplanejar; o ticket volta para a fila.
- `POST /planejamento/tickets/{id}/devolver-comercial` → `{ "motivo": "…" }` — botão "Devolver ao comercial".

---

## 7. `GET /catalogos/planejamento`

Evita enums hard-coded no front.

```json
{
  "tiposDemanda": ["Projeto", "Melhoria", "Sustentação", "Qualidade", "Débito técnico"],
  "prioridades": ["Baixa", "Média", "Alta", "Crítica"],
  "statusDemanda": [
    { "valor": "planejada",  "rotulo": "Planejada" },
    { "valor": "andamento",  "rotulo": "Em andamento" },
    { "valor": "monitorada", "rotulo": "Monitorada" },
    { "valor": "risco",      "rotulo": "Em risco" },
    { "valor": "concluida",  "rotulo": "Concluída" }
  ],
  "distribuicoes": ["linear", "frontLoaded", "manual"],
  "capacidadePadraoHorasSemana": 10
}
```

`GET /devs?squadId=` devolve `id`, `nome`, `iniciais`, `papel`, `capacidadeHorasSemana`, `ativo`.

---

## 8. Regras que precisam morar no back-end

1. **Elegibilidade da fila** — orçamento aprovado e sem alocação. Nunca confiar no filtro do cliente.
2. **Validação de capacidade** — recalcular no POST/PATCH; o cálculo do front é só feedback visual.
   - Inclui checar, turno a turno, que `manha`/`tarde` não colidem com outro `planejamento_slots`, com `calendario_global` (feriado/férias coletiva) nem com `calendario_pessoal` (folga/férias/licença) da pessoa — ver `DATABASE_SCHEMA.md` §5.
3. **`diasParaPrazo` e semana corrente** — data de referência do servidor.
4. **Concorrência** — versão/ETag por alocação.
5. **Permissão** — quem pode planejar, quem pode confirmar estouro, quem pode devolver ao comercial (o botão de estouro deve ser gated por papel).
6. **Auditoria** — registrar quem planejou/replanejou, valores antes e depois; o histórico de replanejamento é requisito de PMO.
7. **Notificação** — `notificarEnvolvidos: true` dispara aviso ao dev e ao solicitante; o front não envia e-mail.

## 9. Desempenho e ordem de implementação
- Um `GET /planejamento/gantt` por carga de tela; nada de chamada por linha.
- 6 devs × 12 semanas × ~2 demandas ≈ payload de poucos KB — cache curto (30–60 s) e revalidação após cada mutação já basta.
- Atualização otimista na UI (a grade responde no clique) com rollback e toast em erro.
- Sequência sugerida: `GET /gantt` (tela em leitura) → `PATCH` (edição inline) → `GET /tickets-aprovados` (fila) → `POST` (planejar) → lote → permissões e auditoria.

## 10. Pendências a confirmar com o time
- ~~Capacidade por dev é fixa ou vem de escala/férias?~~ Resolvido: vem de escala, calculada por turno (`DATABASE_SCHEMA.md` §5) — `porBucket` nunca é configurado à mão.
- Distribuição automática vs. manual dos turnos: quando o front manda só "12h a partir de 26/09", quem escolhe quais turnos exatos viram slots — o usuário no calendário ou o back-end preenchendo turnos livres em ordem?
- Uma demanda pode ter mais de um responsável ou ser dividida entre devs?
- `horasApontadas` vem do módulo de apontamentos em tempo real ou consolidado diário?
- Replanejar um ticket já em andamento exige aprovação de orçamento novamente?
- Prazo acordado é contratual (bloqueia planejar depois dele) ou apenas indicativo?
