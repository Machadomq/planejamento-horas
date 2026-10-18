// Converte os objetos da camada de dados (api.js, com datas) para o formato
// que as telas e lib/capacidade.js já usavam (índices de coluna do Gantt).
import { datasParaBuckets, diasEntre, ehFimDeSemanaISO } from '../lib/periodo.js';

/** Pessoa → linha do Gantt, com a capacidade de cada dia (0 no fim de semana). */
export function pessoaParaGantt(p, periodo) {
  return {
    ...p,
    capacidade: { porBucket: periodo.buckets.map((b) => (ehFimDeSemanaISO(b.inicio) ? 0 : p.horasDiaUtil)) },
  };
}

/** Alocação (datas) → barra do Gantt (bucketInicio/duracaoBuckets), com dados da atividade. */
export function alocacaoParaGantt(a, atividadesPorId, periodo) {
  const at = atividadesPorId[a.atividadeId] || {};
  return {
    id: a.id,
    atividadeId: a.atividadeId,
    tipoAlocacao: a.tipo,
    ticketId: at.codigo,
    titulo: at.titulo,
    tipo: at.tipo,
    prioridade: at.prioridade,
    devId: a.pessoaId,
    ...datasParaBuckets(a.dataInicio, a.dataFim, periodo.inicio),
    horasEstimadas: a.horasEstimadas,
    horasApontadas: a.horasApontadas,
    distribuicao: a.distribuicao,
    pesos: a.pesos,
    status: a.status,
    versao: a.versao,
  };
}

/** Atividade → item da fila "Tickets a planejar" (formato do API_SPEC §3). */
export function atividadeParaFila(at, alocacoes, hoje) {
  const exec = alocacoes.find((a) => a.atividadeId === at.id && a.tipo === 'execucao');
  const orc = alocacoes.find((a) => a.atividadeId === at.id && a.tipo === 'orcamento');
  return {
    id: at.id,
    codigo: at.codigo,
    titulo: at.titulo,
    tipo: at.tipo,
    prioridade: at.prioridade,
    solicitante: { nome: at.solicitante || '—', area: at.area || '' },
    orcamento: {
      horasAprovadas: at.horasAprovadas || 0,
      valorAprovadoCentavos: at.valorAprovadoCentavos || 0,
      aprovadoEm: at.dataAprovacao,
    },
    prazoAcordado: at.prazo,
    diasParaPrazo: at.prazo ? diasEntre(hoje, at.prazo) : null,
    statusOrcamento: at.statusOrcamento,
    alocacaoId: exec ? exec.id : null,
    orcamentoPlanejadoId: orc ? orc.id : null,
  };
}
