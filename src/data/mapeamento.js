// Tradução entre o formato do banco (snake_case) e o do front (camelCase).
// Não depende do Supabase: serve igual para o Oracle.

const num = (v) => (v === null || v === undefined ? v : Number(v));

const PESSOA = {
  id: 'id', nome: 'nome', iniciais: 'iniciais', papel: 'papel', squad: 'squad',
  tipo: 'tipo', horasDiaUtil: 'horas_dia_util',
};

const ATIVIDADE = {
  id: 'id', codigo: 'codigo', titulo: 'titulo', tipo: 'tipo', prioridade: 'prioridade',
  solicitante: 'solicitante', area: 'area', horasAprovadas: 'horas_aprovadas',
  valorAprovadoCentavos: 'valor_aprovado_centavos', dataAprovacao: 'data_aprovacao',
  prazo: 'prazo', statusOrcamento: 'status_orcamento',
};

const ALOCACAO = {
  id: 'id', atividadeId: 'atividade_id', pessoaId: 'pessoa_id', tipo: 'tipo',
  dataInicio: 'data_inicio', dataFim: 'data_fim', horasEstimadas: 'horas_estimadas',
  horasApontadas: 'horas_apontadas', distribuicao: 'distribuicao', pesos: 'pesos',
  status: 'status', versao: 'versao',
};

// Conversões por campo: [do banco → front, do front → banco].
const CONV = {
  horasDiaUtil: [num, num],
  horasAprovadas: [num, num],
  valorAprovadoCentavos: [num, num],
  horasEstimadas: [num, num],
  horasApontadas: [num, num],
  versao: [num, num],
  // Distribuição manual: lista de horas por dia, guardada como texto JSON.
  pesos: [(v) => (v ? JSON.parse(v) : null), (v) => (v && v.length ? JSON.stringify(v) : null)],
};

function doBanco(linha, campos) {
  const out = {};
  for (const [k, col] of Object.entries(campos)) {
    const v = linha[col];
    out[k] = CONV[k] ? CONV[k][0](v) : v;
  }
  return out;
}

/** Só envia os campos presentes (permite atualização parcial). Texto vazio vira NULL. */
function paraBanco(obj, campos) {
  const out = {};
  for (const [k, col] of Object.entries(campos)) {
    if (obj[k] === undefined) continue;
    const v = obj[k] === '' ? null : obj[k];
    out[col] = CONV[k] ? CONV[k][1](v) : v;
  }
  return out;
}

export const pessoaDoBanco = (l) => doBanco(l, PESSOA);
export const pessoaParaBanco = (o) => paraBanco(o, PESSOA);
export const atividadeDoBanco = (l) => doBanco(l, ATIVIDADE);
export const atividadeParaBanco = (o) => paraBanco(o, ATIVIDADE);
export const alocacaoDoBanco = (l) => doBanco(l, ALOCACAO);
export const alocacaoParaBanco = (o) => paraBanco(o, ALOCACAO);
