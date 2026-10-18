// Cliente do Supabase. Só src/data/api.js pode importar este arquivo.
// Ao migrar para Oracle, este arquivo é apagado e api.js passa a chamar o back-end da empresa.
import { createClient } from '@supabase/supabase-js';

const env = import.meta.env || {};
const url = env.VITE_SUPABASE_URL;
// Chave PÚBLICA (publishable/anon). Nunca usar a chave secret/service_role no front-end.
const chave = env.VITE_SUPABASE_ANON_KEY;

export const configurado = Boolean(url && chave);

// TODO(autenticação): com login, a sessão do usuário passa a ser guardada aqui (persistSession: true).
export const supabase = configurado ? createClient(url, chave, { auth: { persistSession: false } }) : null;
