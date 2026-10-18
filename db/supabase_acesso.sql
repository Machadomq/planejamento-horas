-- =====================================================================
-- Regras de acesso — EXCLUSIVO DO SUPABASE (não vai para o Oracle)
-- =====================================================================
-- Rode DEPOIS do schema.sql.
--
-- O Supabase expõe as tabelas para o navegador usando a chave pública.
-- Sem as regras abaixo, o site não conseguiria ler nem gravar nada.
--
-- ATENÇÃO — DEMO SEM LOGIN: estas regras liberam leitura e escrita para
-- QUALQUER pessoa que tenha o link do site (a chave pública fica visível
-- no navegador). Não guarde dados sensíveis aqui.
--
-- TODO(autenticação): quando houver login, trocar "TO anon" por
-- "TO authenticated" e restringir USING/WITH CHECK ao usuário logado.
-- =====================================================================

ALTER TABLE pessoas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE alocacoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alocacao_turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY demo_acesso_publico ON pessoas    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY demo_acesso_publico ON atividades FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY demo_acesso_publico ON alocacoes  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY demo_acesso_publico ON alocacao_turnos FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON pessoas    TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON atividades TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON alocacoes  TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON alocacao_turnos TO anon;
