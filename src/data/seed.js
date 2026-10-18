// Dados de exemplo para a demo, gerados a partir de mock.js.
// As datas do mock (período que começava em 31/08/2026) são deslocadas para
// que o dia 0 do mock caia no início do período atual do Gantt: a demo
// sempre aparece preenchida em volta de "hoje", com os dias da semana preservados.
import * as mock from './mock.js';
import { novoId } from '../lib/ids.js';
import { diasEntre, hojeISO, inicioPeriodo, somarDias } from '../lib/periodo.js';

const INICIO_MOCK = '2026-08-31';
const VALOR_HORA_CENTAVOS = 45000; // R$ 450/h, o mesmo do mock (48 h = R$ 21.600)

// As 30 alocações do mock apontam para tickets que não estão na lista de tickets;
// esses solicitantes são inventados (plausíveis) para criar as atividades.
const SOLICITANTES = [
  ['Marina Duarte', 'Operações'], ['Rogério Pinto', 'Controladoria'], ['Helena Braga', 'Logística'],
  ['Caio Severino', 'RH'], ['Tatiana Rios', 'Comercial'], ['Sérgio Nakano', 'PMO'],
  ['Paula Khoury', 'Folha'], ['Ivan Mattos', 'Compliance'],
];
const PRIORIDADES_CICLO = ['Média', 'Alta', 'Baixa', 'Média'];

export function gerarExemplos(hoje = hojeISO()) {
  const desloc = diasEntre(INICIO_MOCK, inicioPeriodo(hoje));
  const data = (iso) => (iso ? somarDias(iso, desloc) : null);
  const dia = (i) => somarDias(INICIO_MOCK, desloc + i);

  const idPessoa = {};
  const pessoa = (p, tipo, squad) => {
    idPessoa[p.id] = novoId();
    return { id: idPessoa[p.id], nome: p.nome, iniciais: p.iniciais, papel: p.papel, squad, tipo, horasDiaUtil: 8 };
  };
  const pessoas = mock.devs.map((d) => pessoa(d, 'dev', d.squad))
    .concat(mock.pos.map((p) => pessoa(p, 'po', 'Produto')));

  const atividades = [];
  const alocacoes = [];
  const idAtividade = {};

  // Tickets da fila (aprovados ainda sem alocação + pré-orçamento).
  mock.tickets.forEach((t) => {
    const aprovado = t.statusOrcamento === 'aprovado';
    idAtividade[t.id] = novoId();
    atividades.push({
      id: idAtividade[t.id], codigo: t.id, titulo: t.titulo, tipo: t.tipo, prioridade: t.prioridade,
      solicitante: t.solicitante.nome, area: t.solicitante.area,
      horasAprovadas: t.orcamento.horasAprovadas,
      valorAprovadoCentavos: aprovado ? t.orcamento.valorAprovadoCentavos : null,
      dataAprovacao: aprovado ? data(t.orcamento.aprovadoEm) : null,
      prazo: data(t.prazoAcordado), statusOrcamento: t.statusOrcamento,
    });
  });

  // Atividades já planejadas no Gantt (uma por alocação do mock).
  mock.alocacoes.forEach((a, i) => {
    const [solicitante, area] = SOLICITANTES[i % SOLICITANTES.length];
    const atividadeId = novoId();
    atividades.push({
      id: atividadeId, codigo: a.ticketId, titulo: a.titulo, tipo: a.tipo,
      prioridade: a.status === 'risco' ? 'Alta' : PRIORIDADES_CICLO[i % PRIORIDADES_CICLO.length],
      solicitante, area, horasAprovadas: a.horasEstimadas,
      valorAprovadoCentavos: a.horasEstimadas * VALOR_HORA_CENTAVOS,
      dataAprovacao: dia(a.bucketInicio - 5), prazo: dia(a.bucketInicio + a.duracaoBuckets + 4),
      statusOrcamento: 'aprovado',
    });
    alocacoes.push({
      id: novoId(), atividadeId, pessoaId: idPessoa[a.devId], tipo: 'execucao',
      dataInicio: dia(a.bucketInicio), dataFim: dia(a.bucketInicio + a.duracaoBuckets - 1),
      horasEstimadas: a.horasEstimadas, horasApontadas: a.horasApontadas,
      distribuicao: 'linear', pesos: null, status: a.status, versao: 1,
    });
  });

  // Dois pré-orçamentos já agendados com POs, para as linhas dos POs aparecerem no Gantt.
  // Dias 15–17 = ter–qui da semana atual; 21–23 = seg–qua da próxima.
  [['TCK-4324', 'usr_201', 15, 17, 8, 'andamento'], ['TCK-4306', 'usr_202', 21, 23, 8, 'planejada']]
    .forEach(([codigo, poId, ini, fim, horas, status]) => {
      alocacoes.push({
        id: novoId(), atividadeId: idAtividade[codigo], pessoaId: idPessoa[poId], tipo: 'orcamento',
        dataInicio: dia(ini), dataFim: dia(fim), horasEstimadas: horas, horasApontadas: 0,
        distribuicao: 'linear', pesos: null, status, versao: 1,
      });
    });

  return { pessoas, atividades, alocacoes };
}
