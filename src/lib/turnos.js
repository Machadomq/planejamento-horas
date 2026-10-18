// Regra dos turnos: o dia útil tem 2 turnos de 4h (manhã e tarde) e o turno
// é a menor peça do planejamento. Uma pessoa nunca tem duas atividades no
// mesmo turno (o banco garante com UNIQUE(pessoa_id, data, periodo)).
//
// Nas telas, um turno é { indice, periodo }: `indice` é a coluna (dia) do Gantt.
import { ehFimDeSemanaISO } from './periodo.js';

export const HORAS_TURNO = 4;
export const PERIODOS = ['manha', 'tarde'];

export const chaveTurno = (indice, periodo) => indice + '|' + periodo;

/** Turnos de trabalho da jornada: integral = manhã e tarde. */
export function periodosDaJornada(jornada) {
  if (jornada === 'manha') return ['manha'];
  if (jornada === 'tarde') return ['tarde'];
  return PERIODOS;
}

/** Turnos em que a pessoa trabalha naquele dia (nenhum no fim de semana). */
export function turnosDisponiveis(pessoa, bucket) {
  if (!bucket || ehFimDeSemanaISO(bucket.inicio)) return [];
  return periodosDaJornada(pessoa && pessoa.jornada);
}

/** Mapa chave → alocação dos turnos já ocupados da pessoa (ignorando a alocação `ignorarId`). */
export function turnosOcupados(alocacoes, pessoaId, ignorarId) {
  const m = new Map();
  alocacoes.forEach((a) => {
    if (a.devId !== pessoaId || a.id === ignorarId) return;
    (a.turnos || []).forEach((t) => m.set(chaveTurno(t.indice, t.periodo), a));
  });
  return m;
}

/** Arredonda para cima até um múltiplo de 4 h (mínimo 4 h). */
export const arredondarTurno = (h) => Math.max(HORAS_TURNO, Math.ceil((h || 0) / HORAS_TURNO) * HORAS_TURNO);

/**
 * Distribuição "Linear": preenche os turnos LIVRES a partir do início da janela
 * (manhã, tarde, dia seguinte…). Devolve os turnos e quantos faltaram.
 */
export function distribuirLinear(pessoa, buckets, inicio, duracao, horas, ocupados) {
  const precisa = Math.ceil(horas / HORAS_TURNO);
  const turnos = [];
  for (let i = Math.max(0, inicio); i < inicio + duracao && i < buckets.length && turnos.length < precisa; i++) {
    for (const p of turnosDisponiveis(pessoa, buckets[i])) {
      if (turnos.length >= precisa) break;
      if (!ocupados.has(chaveTurno(i, p))) turnos.push({ indice: i, periodo: p });
    }
  }
  return { turnos, faltam: precisa - turnos.length };
}

/** Menor janela (em dias corridos) a partir de `inicio` com turnos livres suficientes para `horas`. */
export function duracaoParaCaber(pessoa, buckets, inicio, horas, ocupados) {
  const { turnos } = distribuirLinear(pessoa, buckets, inicio, buckets.length - inicio, horas, ocupados);
  if (!turnos.length) return 1;
  return turnos[turnos.length - 1].indice - inicio + 1;
}

/** Posição do turno na linha do tempo em meios-dias (dia 3 manhã = 6, dia 3 tarde = 7). */
export const meioDia = (t) => t.indice * 2 + (t.periodo === 'tarde' ? 1 : 0);

/**
 * Agrupa os turnos em trechos contínuos, para desenhar as barras do Gantt.
 * Devolve [[primeiroMeioDia, ultimoMeioDia], …]. Dia ou turno sem trabalho quebra o trecho.
 */
export function trechos(turnos) {
  const out = [];
  turnos.map(meioDia).sort((a, b) => a - b).forEach((x) => {
    const u = out[out.length - 1];
    if (u && x === u[1] + 1) u[1] = x;
    else out.push([x, x]);
  });
  return out;
}
