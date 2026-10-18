# Modelo de dados — Planejamento de horas dos devs (PostgreSQL)

Documento de referência para implementar o banco que sustenta as três telas descritas em `API_SPEC.md`. Descreve **como os dados são organizados**, a regra de negócio central (turnos de 4h) e como ela é garantida pelo próprio schema, não só por validação na aplicação.

Convenções: `snake_case` nas tabelas/colunas, datas em `DATE` (sem hora), horas em `NUMERIC`, chaves primárias em `UUID` (exceto onde já existe um identificador natural, como o id do ticket).

---

## 1. Conceito central: o turno de 4h é a menor peça

O sistema não aloca "um dia" para uma demanda — aloca **turnos**. Cada dia útil tem 2 turnos (`manha`, `tarde`), cada um valendo 4h. Uma alocação de 12h é sempre composta de 3 turnos; nunca existe "meia peça".

Essa decisão de modelagem é o que faz as regras de negócio virarem *constraints* de banco em vez de `if`s espalhados pela aplicação:

| Regra de negócio | Como o schema garante |
|---|---|
| Mínimo 4h por planejamento | Cada turno já vale 4h; todo planejamento tem ≥ 1 turno |
| Só múltiplos de 4 (4, 8, 12, 16…) | Horas totais = soma de turnos de 4h — não existe fração |
| No máximo 2 demandas por pessoa/dia | Só existem 2 valores de `periodo` (`manha`/`tarde`); `UNIQUE(recurso_id, data, periodo)` impede um terceiro |
| Não alocar em feriado / férias coletiva | Checagem contra `calendario_global` antes do INSERT |
| Não alocar em folga / férias / licença pessoal | Checagem contra `calendario_pessoal` antes do INSERT |
| Não alocar em fim de semana | `EXTRACT(DOW FROM data) NOT IN (0, 6)` |
| Duas pessoas não sobrescrevem o mesmo turno | `UNIQUE(recurso_id, data, periodo)` em `planejamento_slots` — o Postgres recusa o INSERT duplicado |

---

## 2. Diagrama das tabelas

```
recursos ──┬── calendario_pessoal   (folgas/férias/licenças da pessoa)
           └── planejamento_slots   (o que a pessoa faz em cada turno de 4h) ── planejamentos ── demandas

calendario_global   (feriados/férias coletivas — vale pra empresa toda, sem recurso_id)
```

Importante: **não existe uma tabela por pessoa.** Ana, Bruno, Carla e todo futuro contratado moram nas mesmas tabelas (`recursos`, `calendario_pessoal`, `planejamento_slots`); o que diferencia as linhas de cada um é a coluna `recurso_id`, não a tabela. Ver seção 7 para o motivo.

---

## 3. DDL completo

### 3.1 `recursos` — pessoas (devs, POs)

```sql
CREATE TABLE recursos (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      TEXT NOT NULL,
  iniciais  TEXT NOT NULL,
  papel     TEXT,                       -- ex: "Backend · Fiscal", "PO · Financeiro/RH"
  squad_id  UUID REFERENCES squads(id),
  ativo     BOOLEAN NOT NULL DEFAULT TRUE
);
```

### 3.2 `calendario_global` — feriados e férias coletivas (empresa toda)

```sql
CREATE TABLE calendario_global (
  id        SERIAL PRIMARY KEY,
  data      DATE NOT NULL,
  tipo      TEXT NOT NULL CHECK (tipo IN ('feriado', 'ferias_coletiva', 'ponto_facultativo')),
  descricao TEXT NOT NULL,
  UNIQUE (data, tipo)
);
```

Guardar **um dia por linha** (não um intervalo `data_inicio`/`data_fim`). Facilita muito a consulta "esse dia é útil?" na view de disponibilidade (seção 5).

### 3.3 `calendario_pessoal` — folgas, férias, licenças de cada pessoa

```sql
CREATE TABLE calendario_pessoal (
  id         SERIAL PRIMARY KEY,
  recurso_id UUID NOT NULL REFERENCES recursos(id),
  data       DATE NOT NULL,
  periodo    TEXT NOT NULL CHECK (periodo IN ('dia_inteiro', 'manha', 'tarde')),
  tipo       TEXT NOT NULL CHECK (tipo IN ('ferias', 'folga', 'licenca', 'atestado')),
  descricao  TEXT,
  UNIQUE (recurso_id, data, periodo)
);
```

### 3.4 `demandas` — os tickets (vem da fila de orçamento aprovado)

```sql
CREATE TABLE demandas (
  id                      TEXT PRIMARY KEY,     -- ex: "TCK-4312"
  titulo                  TEXT NOT NULL,
  tipo                    TEXT NOT NULL,        -- Projeto, Melhoria, Sustentação...
  prioridade              TEXT NOT NULL,
  status_orcamento        TEXT NOT NULL,
  horas_aprovadas         NUMERIC(6,2),
  valor_aprovado_centavos BIGINT,
  prazo_acordado          DATE,
  solicitante_nome        TEXT,
  solicitante_area        TEXT
);
```

### 3.5 `planejamentos` — cabeçalho da alocação (a barra do Gantt)

```sql
CREATE TABLE planejamentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id      TEXT NOT NULL REFERENCES demandas(id),
  recurso_id      UUID NOT NULL REFERENCES recursos(id),
  status          TEXT NOT NULL DEFAULT 'planejada',
  horas_estimadas NUMERIC(6,2) NOT NULL CHECK (horas_estimadas > 0 AND horas_estimadas % 4 = 0),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  versao          INT NOT NULL DEFAULT 1        -- concorrência otimista (ver API_SPEC.md §6)
);
```

`horas_estimadas` deve sempre bater com `SUM(horas) FROM planejamento_slots WHERE planejamento_id = ...` — ver seção 6 sobre manter isso consistente.

### 3.6 `planejamento_slots` — o detalhe: cada linha é um turno de 4h ocupado

```sql
CREATE TABLE planejamento_slots (
  id              SERIAL PRIMARY KEY,
  planejamento_id UUID NOT NULL REFERENCES planejamentos(id) ON DELETE CASCADE,
  recurso_id      UUID NOT NULL REFERENCES recursos(id),
  data            DATE NOT NULL,
  periodo         TEXT NOT NULL CHECK (periodo IN ('manha', 'tarde')),
  horas           NUMERIC(4,2) NOT NULL DEFAULT 4,

  UNIQUE (recurso_id, data, periodo)   -- trava principal: impede sobreposição
);
```

---

## 4. Exemplo de ponta a ponta

Planejar a demanda `TCK-12345` para a Amanda: dia 26/09 inteiro (8h) + dia 27/09 só a tarde (4h) = **12h**.

```sql
-- 1. cabeçalho
INSERT INTO planejamentos (id, demanda_id, recurso_id, status, horas_estimadas)
VALUES ('plj_001', 'TCK-12345', 'usr_amanda', 'planejada', 12);

-- 2. turnos (3 turnos de 4h = 12h)
INSERT INTO planejamento_slots (planejamento_id, recurso_id, data, periodo, horas)
VALUES
  ('plj_001', 'usr_amanda', '2026-09-26', 'manha', 4),
  ('plj_001', 'usr_amanda', '2026-09-26', 'tarde', 4),
  ('plj_001', 'usr_amanda', '2026-09-27', 'tarde', 4);
```

Resultado em `planejamento_slots`:

| id | planejamento_id | recurso_id | data | periodo | horas |
|---|---|---|---|---|---|
| 1 | plj_001 | usr_amanda | 2026-09-26 | manha | 4 |
| 2 | plj_001 | usr_amanda | 2026-09-26 | tarde | 4 |
| 3 | plj_001 | usr_amanda | 2026-09-27 | tarde | 4 |

O turno 2026-09-27/manhã **não tem linha** — continua livre para outra demanda. Se alguém tentar inserir outro slot em `usr_amanda` + `2026-09-26` + `manha`, o Postgres recusa por violação do `UNIQUE`.

---

## 5. View de disponibilidade

Não existe uma tabela de "dias disponíveis" guardada — ela é **calculada** cruzando calendário global, calendário pessoal, fim de semana e o que já está alocado:

```sql
CREATE VIEW capacidade_slots AS
SELECT
  r.id AS recurso_id,
  d.data,
  p.periodo,
  (
    EXTRACT(DOW FROM d.data) NOT IN (0, 6)
    AND NOT EXISTS (
      SELECT 1 FROM calendario_global g WHERE g.data = d.data
    )
    AND NOT EXISTS (
      SELECT 1 FROM calendario_pessoal cp
      WHERE cp.recurso_id = r.id AND cp.data = d.data
        AND cp.periodo IN (p.periodo, 'dia_inteiro')
    )
    AND NOT EXISTS (
      SELECT 1 FROM planejamento_slots ps
      WHERE ps.recurso_id = r.id AND ps.data = d.data AND ps.periodo = p.periodo
    )
  ) AS disponivel
FROM recursos r
CROSS JOIN generate_series('2026-01-01'::date, '2026-12-31'::date, '1 day') AS d(data)
CROSS JOIN (VALUES ('manha'), ('tarde')) AS p(periodo);
```

Essa view é a base para montar o `capacidade.porBucket` que `GET /planejamento/gantt` devolve (ver `API_SPEC.md` §2): agrupando por dia e somando os turnos disponíveis × 4h, dá a capacidade daquele dia para aquele recurso.

---

## 6. Cuidados de implementação

- **Toda escrita em `planejamento_slots` deve ser transacional** com a atualização de `horas_estimadas` em `planejamentos` (envolver ambas no mesmo `BEGIN ... COMMIT`, ou usar uma trigger `AFTER INSERT/DELETE` que recalcula `horas_estimadas` a partir da soma dos slots). Nunca deixar os dois campos divergirem.
- **`confirmarEstouro` (API_SPEC.md §5)**: antes de inserir os slots, rodar a checagem de disponibilidade (seção 5) para cada turno pedido. Se algum já estiver ocupado ou cair em dia indisponível, devolver 422 como o contrato já especifica — só inserir se `confirmarEstouro: true` vier do front (ou seja, mesmo estourando o front pode forçar, mas indisponibilidade por folga/feriado normalmente não deveria ser contornável do mesmo jeito que capacidade — decisão de negócio a confirmar com o time).
- **`DELETE /planejamento/alocacoes/{id}`** (desplanejar): apagar o `planejamento`, os slots somem sozinhos via `ON DELETE CASCADE`.
- **Distribuição automática vs. manual**: este schema não define *qual* turno o sistema escolhe quando o front manda só "12h a partir de 26/09" — isso é lógica de aplicação (turno a turno, checando disponibilidade em ordem). O schema só garante que, seja qual for a escolha, ela não pode colidir com outro planejamento.

---

## 7. Por que uma tabela só (e não uma tabela por pessoa)

Regra geral de banco relacional: **tabela por tipo de dado (entidade), não por instância**. `calendario_pessoal` e `planejamento_slots` guardam todas as pessoas juntas, diferenciadas pela coluna `recurso_id` — não uma tabela `calendario_ana`, `calendario_bruno`, etc.

Motivos práticos:
- Contratar alguém novo não exige nenhuma alteração de schema, só INSERTs com o `recurso_id` novo.
- Consultas como "quem está de férias hoje?" viram uma query simples (`WHERE data = hoje`), em vez de um `UNION` de N tabelas.
- O `UNIQUE(recurso_id, data, periodo)` — a trava que impede sobreposição — só existe numa tabela compartilhada.
- `JOIN recursos ON recursos.id = planejamento_slots.recurso_id` só funciona quando os dados estão relacionados por chave estrangeira, não espalhados em tabelas paralelas.
