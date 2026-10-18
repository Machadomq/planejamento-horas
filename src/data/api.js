// =====================================================================
// Camada de acesso a dados — o ÚNICO ponto do front que fala com o banco.
// =====================================================================
// As telas só chamam as funções exportadas aqui. Para trocar o Supabase
// pelo Oracle, reescreva o corpo destas funções (por exemplo, com fetch
// para uma API da empresa) mantendo os mesmos nomes, parâmetros e retornos.
//
// Formato dos objetos (camelCase, datas 'AAAA-MM-DD'):
//   Pessoa    { id, nome, iniciais, papel, squad, tipo: 'dev'|'po', horasDiaUtil }
//   Atividade { id, codigo, titulo, tipo, prioridade, solicitante, area, horasAprovadas,
//               valorAprovadoCentavos, dataAprovacao, prazo, statusOrcamento }
//   Alocacao  { id, atividadeId, pessoaId, tipo: 'execucao'|'orcamento', dataInicio, dataFim,
//               horasEstimadas, horasApontadas, distribuicao, pesos, status, versao }
//
// Erros: toda função rejeita com um Error de mensagem em português e
// `erro.codigo` = 'sem_conexao' | 'em_uso' | 'duplicado' | 'nao_encontrado' |
//                 'sem_permissao' | 'nao_configurado' | 'desconhecido'.
//
// TODO(autenticação): sem login, qualquer pessoa com o link pode ler e
// gravar (ver db/supabase_acesso.sql). Com login, conferir a sessão aqui.
// =====================================================================
import { supabase } from './supabase.js';
import {
  pessoaDoBanco, pessoaParaBanco, atividadeDoBanco, atividadeParaBanco,
  alocacaoDoBanco, alocacaoParaBanco,
} from './mapeamento.js';
import { novoId } from '../lib/ids.js';
import { gerarExemplos } from './seed.js';

function erroAmigavel(error, acao) {
  const msg = String((error && error.message) || error || '');
  let codigo = 'desconhecido';
  let detalhe = 'Tente de novo em instantes.';
  if (/fetch|network|Load failed|NetworkError/i.test(msg)) {
    codigo = 'sem_conexao'; detalhe = 'Sem conexão com o banco. Confira a internet e tente de novo.';
  } else if (error && error.code === '23503') {
    codigo = 'em_uso'; detalhe = 'Existem registros ligados a este item.';
  } else if (error && error.code === '23505') {
    codigo = 'duplicado'; detalhe = 'Já existe um registro com esse código.';
  } else if (error && error.code === 'PGRST116') {
    codigo = 'nao_encontrado'; detalhe = 'O registro não existe mais (talvez tenha sido excluído).';
  } else if (error && error.code === '42501') {
    codigo = 'sem_permissao'; detalhe = 'O banco recusou a gravação por falta de permissão (confira db/supabase_acesso.sql).';
  } else if (msg) {
    detalhe += ' (Detalhe técnico: ' + msg + ')';
  }
  const e = new Error('Não foi possível ' + acao + '. ' + detalhe);
  e.codigo = codigo;
  e.original = error;
  return e;
}

async function executar(acao, montarConsulta) {
  if (!supabase) {
    const e = new Error('Banco não configurado: confira o arquivo .env (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).');
    e.codigo = 'nao_configurado';
    throw e;
  }
  let resposta;
  try {
    resposta = await montarConsulta(supabase);
  } catch (err) {
    throw erroAmigavel(err, acao);
  }
  if (resposta.error) throw erroAmigavel(resposta.error, acao);
  return resposta.data;
}

// ---------------------------------------------------------------- Pessoas

export async function listarPessoas() {
  const linhas = await executar('carregar as pessoas', (db) => db.from('pessoas').select('*').order('nome'));
  return linhas.map(pessoaDoBanco);
}

export async function criarPessoa(dados) {
  const linha = await executar('salvar a pessoa', (db) =>
    db.from('pessoas').insert(pessoaParaBanco({ ...dados, id: novoId() })).select().single());
  return pessoaDoBanco(linha);
}

export async function atualizarPessoa(id, campos) {
  const linha = await executar('atualizar a pessoa', (db) =>
    db.from('pessoas').update(pessoaParaBanco({ ...campos, id: undefined })).eq('id', id).select().single());
  return pessoaDoBanco(linha);
}

/** O banco recusa (erro 'em_uso') se a pessoa ainda tiver alocações. */
export async function excluirPessoa(id) {
  await executar('excluir a pessoa', (db) => db.from('pessoas').delete().eq('id', id));
}

// ------------------------------------------------------------- Atividades

export async function listarAtividades() {
  const linhas = await executar('carregar as atividades', (db) => db.from('atividades').select('*').order('codigo'));
  return linhas.map(atividadeDoBanco);
}

export async function criarAtividade(dados) {
  const linha = await executar('salvar a atividade', (db) =>
    db.from('atividades').insert(atividadeParaBanco({ ...dados, id: novoId() })).select().single());
  return atividadeDoBanco(linha);
}

export async function atualizarAtividade(id, campos) {
  const linha = await executar('atualizar a atividade', (db) =>
    db.from('atividades').update(atividadeParaBanco({ ...campos, id: undefined })).eq('id', id).select().single());
  return atividadeDoBanco(linha);
}

/** Apaga junto as alocações da atividade (ON DELETE CASCADE no schema). */
export async function excluirAtividade(id) {
  await executar('excluir a atividade', (db) => db.from('atividades').delete().eq('id', id));
}

// -------------------------------------------------------------- Alocações

export async function listarAlocacoes() {
  const linhas = await executar('carregar as alocações', (db) => db.from('alocacoes').select('*').order('data_inicio'));
  return linhas.map(alocacaoDoBanco);
}

export async function criarAlocacao(dados) {
  const linha = await executar('salvar o planejamento', (db) =>
    db.from('alocacoes').insert(alocacaoParaBanco({ ...dados, id: novoId(), versao: 1 })).select().single());
  return alocacaoDoBanco(linha);
}

/** `versaoAtual` é incrementada a cada gravação (concorrência otimista; hoje não bloqueia). */
export async function atualizarAlocacao(id, campos, versaoAtual) {
  const linha = await executar('atualizar a alocação', (db) =>
    db.from('alocacoes')
      .update({
        ...alocacaoParaBanco({ ...campos, id: undefined, versao: (versaoAtual || 0) + 1 }),
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id).select().single());
  return alocacaoDoBanco(linha);
}

/** Desplanejar: a atividade volta para a fila. */
export async function excluirAlocacao(id) {
  await executar('excluir a alocação', (db) => db.from('alocacoes').delete().eq('id', id));
}

// ------------------------------------------------------------------ Geral

export async function carregarTudo() {
  const [pessoas, atividades, alocacoes] = await Promise.all([listarPessoas(), listarAtividades(), listarAlocacoes()]);
  return { pessoas, atividades, alocacoes };
}

/** Apaga TODOS os dados (alocações → atividades → pessoas, por causa das chaves estrangeiras). */
export async function limparTudo() {
  // O Supabase exige um filtro no DELETE; "id não nulo" pega todas as linhas.
  await executar('apagar as alocações', (db) => db.from('alocacoes').delete().not('id', 'is', null));
  await executar('apagar as atividades', (db) => db.from('atividades').delete().not('id', 'is', null));
  await executar('apagar as pessoas', (db) => db.from('pessoas').delete().not('id', 'is', null));
}

/** Apaga tudo e grava os dados de exemplo, com datas relativas a hoje. */
export async function restaurarExemplos() {
  const ex = gerarExemplos();
  await limparTudo();
  await executar('gravar as pessoas de exemplo', (db) => db.from('pessoas').insert(ex.pessoas.map(pessoaParaBanco)));
  await executar('gravar as atividades de exemplo', (db) => db.from('atividades').insert(ex.atividades.map(atividadeParaBanco)));
  await executar('gravar as alocações de exemplo', (db) => db.from('alocacoes').insert(ex.alocacoes.map(alocacaoParaBanco)));
  return { pessoas: ex.pessoas.length, atividades: ex.atividades.length, alocacoes: ex.alocacoes.length };
}
