-- =====================================================================
-- Migração 001 — planejamento em turnos de 4 h (manhã/tarde)
-- =====================================================================
-- Rode UMA vez no banco que já existia antes desta mudança.
-- (Instalação do zero: basta schema.sql + supabase_acesso.sql.)
--
-- O que faz:
--   1. cria a tabela alocacao_turnos (um registro por turno de 4 h);
--   2. troca "horas_dia_util" das pessoas por "jornada"
--      (até 4 h/dia → 'manha'; acima disso → 'integral').
-- Depois desta migração, os turnos das alocações existentes são gerados
-- pela aplicação (as alocações ainda não têm turnos).
-- =====================================================================

-- 1. Turnos ------------------------------------------------------------
CREATE TABLE alocacao_turnos (
  id           VARCHAR(36) PRIMARY KEY,
  alocacao_id  VARCHAR(36) NOT NULL REFERENCES alocacoes (id) ON DELETE CASCADE,
  pessoa_id    VARCHAR(36) NOT NULL REFERENCES pessoas (id),
  data         DATE        NOT NULL,
  periodo      VARCHAR(5)  NOT NULL CHECK (periodo IN ('manha', 'tarde')),
  UNIQUE (pessoa_id, data, periodo)
);

CREATE INDEX ix_turnos_alocacao ON alocacao_turnos (alocacao_id);

-- 2. Jornada das pessoas -------------------------------------------------
ALTER TABLE pessoas ADD jornada VARCHAR(8) DEFAULT 'integral' NOT NULL;
ALTER TABLE pessoas ADD CONSTRAINT ck_pessoas_jornada CHECK (jornada IN ('integral', 'manha', 'tarde'));
UPDATE pessoas SET jornada = 'manha' WHERE horas_dia_util <= 4;
ALTER TABLE pessoas DROP COLUMN horas_dia_util;

-- 3. SOMENTE SUPABASE (não vai para o Oracle) -----------------------------
-- Libera a tabela nova para o site, igual às outras (ver supabase_acesso.sql).
-- TODO(autenticação): trocar "TO anon" por "TO authenticated" quando houver login.
ALTER TABLE alocacao_turnos ENABLE ROW LEVEL SECURITY;
CREATE POLICY demo_acesso_publico ON alocacao_turnos FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON alocacao_turnos TO anon;
