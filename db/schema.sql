-- =====================================================================
-- Planejamento de horas — schema da DEMO
-- =====================================================================
-- Escrito em SQL padrão para facilitar a migração futura para Oracle:
--   * IDs são texto (UUID gerado pela aplicação), sem função do banco;
--   * sem tipos exclusivos do Postgres (jsonb, arrays, serial, boolean);
--   * NUMERIC e VARCHAR funcionam nos dois bancos.
-- Para Oracle, troque VARCHAR por VARCHAR2 e NUMERIC por NUMBER
-- (o resto roda igual).
--
-- Regras de acesso específicas do Supabase ficam em supabase_acesso.sql,
-- separadas de propósito: elas NÃO vão para o Oracle.
-- =====================================================================

-- Pessoas (devs e POs). Fim de semana não é dia útil: a capacidade é
-- horas_dia_util em seg–sex e 0 em sáb/dom (calculada na aplicação).
CREATE TABLE pessoas (
  id              VARCHAR(36)  PRIMARY KEY,
  nome            VARCHAR(120) NOT NULL,
  iniciais        VARCHAR(4)   NOT NULL,
  papel           VARCHAR(120),
  squad           VARCHAR(80),
  tipo            VARCHAR(3)   NOT NULL CHECK (tipo IN ('dev', 'po')),
  horas_dia_util  NUMERIC(4,1) DEFAULT 8 NOT NULL CHECK (horas_dia_util > 0 AND horas_dia_util <= 24),
  criado_em       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Atividades (tickets). O "codigo" (TCK-4312) é editável, por isso não é
-- a chave primária; o UNIQUE impede dois tickets com o mesmo código.
-- Tipo e prioridade são listas fixas no front (src/data/catalogos.js).
CREATE TABLE atividades (
  id                       VARCHAR(36)   PRIMARY KEY,
  codigo                   VARCHAR(20)   NOT NULL UNIQUE,
  titulo                   VARCHAR(200)  NOT NULL,
  tipo                     VARCHAR(30)   NOT NULL,
  prioridade               VARCHAR(10)   NOT NULL,
  solicitante              VARCHAR(120),
  area                     VARCHAR(80),
  horas_aprovadas          NUMERIC(6,1)  DEFAULT 0 NOT NULL,
  valor_aprovado_centavos  NUMERIC(14,0),
  data_aprovacao           DATE,
  prazo                    DATE,
  status_orcamento         VARCHAR(15)   NOT NULL CHECK (status_orcamento IN ('aprovado', 'pre_orcamento')),
  criado_em                TIMESTAMP     DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Alocações: as barras do Gantt.
--   tipo = 'execucao'  → um dev executando a atividade
--   tipo = 'orcamento' → um PO elaborando o pré-orçamento
-- data_inicio/data_fim são inclusivas (a barra cobre os dois dias).
-- pesos: só para distribuição manual; lista de horas por dia guardada
--        como texto JSON (ex.: "[8,0,4]") — funciona igual no Oracle.
CREATE TABLE alocacoes (
  id               VARCHAR(36)   PRIMARY KEY,
  -- Excluir a atividade apaga suas alocações junto (decisão de negócio).
  atividade_id     VARCHAR(36)   NOT NULL REFERENCES atividades (id) ON DELETE CASCADE,
  -- SEM cascade: o banco recusa excluir uma pessoa que ainda tem alocações.
  pessoa_id        VARCHAR(36)   NOT NULL REFERENCES pessoas (id),
  tipo             VARCHAR(10)   NOT NULL CHECK (tipo IN ('execucao', 'orcamento')),
  data_inicio      DATE          NOT NULL,
  data_fim         DATE          NOT NULL,
  horas_estimadas  NUMERIC(6,1)  NOT NULL CHECK (horas_estimadas > 0),
  horas_apontadas  NUMERIC(6,1)  DEFAULT 0 NOT NULL,
  distribuicao     VARCHAR(12)   DEFAULT 'linear' NOT NULL CHECK (distribuicao IN ('linear', 'frontLoaded', 'manual')),
  pesos            VARCHAR(4000),
  status           VARCHAR(12)   DEFAULT 'planejada' NOT NULL CHECK (status IN ('planejada', 'andamento', 'monitorada', 'risco', 'concluida')),
  versao           INTEGER       DEFAULT 1 NOT NULL,
  criado_em        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP NOT NULL,
  atualizado_em    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CHECK (data_fim >= data_inicio),
  -- Cada atividade tem no máximo 1 alocação de execução e 1 de orçamento.
  UNIQUE (atividade_id, tipo)
);

CREATE INDEX ix_alocacoes_pessoa ON alocacoes (pessoa_id);
