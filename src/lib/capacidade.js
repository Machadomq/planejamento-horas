import { c } from '../theme.js';
import { HORAS_TURNO } from './turnos.js';

export const CAP_SEMANA_PADRAO = 10;

export function ehFimDeSemana(bucket) {
  const dow = new Date(bucket.inicio + 'T12:00:00').getDay();
  return dow === 0 || dow === 6;
}

/**
 * Horas que uma alocação joga em cada bucket (dia) do período: 4 h por turno.
 * Os turnos são a fonte da verdade (ver lib/turnos.js); turnos fora do período são ignorados.
 */
export function horasPorBucket(alocacao, buckets) {
  const nBuckets = buckets.length;
  const out = Array(nBuckets).fill(0);
  (alocacao.turnos || []).forEach((t) => {
    if (t.indice >= 0 && t.indice < nBuckets) out[t.indice] += HORAS_TURNO;
  });
  return out;
}

/** Carga total de um dev por bucket. */
export function cargaDev(alocacoes, devId, buckets) {
  const out = Array(buckets.length).fill(0);
  alocacoes.filter((a) => a.devId === devId).forEach((a) => {
    horasPorBucket(a, buckets).forEach((h, i) => { out[i] += h; });
  });
  return out;
}

export function capacidadeBucket(dev, b) {
  if (dev.capacidade && dev.capacidade.porBucket && dev.capacidade.porBucket.length) {
    return dev.capacidade.porBucket[b];
  }
  return (dev.capacidade && dev.capacidade.horasSemana) || CAP_SEMANA_PADRAO;
}

/** Soma da capacidade de um dev nos buckets [inicio, fim). */
export function capacidadeJanela(dev, inicio, fim) {
  let s = 0;
  for (let i = inicio; i < fim; i++) s += capacidadeBucket(dev, i) || 0;
  return s;
}

export function ocupacaoDev(dev, alocacoes, buckets) {
  const carga = cargaDev(alocacoes, dev.id, buckets);
  return carga.map((h, b) => h / capacidadeBucket(dev, b));
}

/** Faixas de ocupação: <=80% verde, 80-100% âmbar, >100% vermelho. */
export function corOcupacao(p) {
  if (p > 1) return c.red;
  if (p >= 0.85) return c.amber;
  return c.green;
}

export function corHeat(horas, cap) {
  if (!horas) return c.heatEmpty;
  const p = horas / cap;
  if (p > 1) return c.red;
  if (p > 0.8) return c.amber;
  return c.heatFree;
}

/** Intervalos contíguos onde o teste é verdadeiro. */
export function spans(arr, teste) {
  const out = [];
  let ini = null;
  arr.forEach((v, i) => {
    if (teste(v, i)) { if (ini === null) ini = i; }
    else if (ini !== null) { out.push([ini, i - 1]); ini = null; }
  });
  if (ini !== null) out.push([ini, arr.length - 1]);
  return out;
}

export function rotuloSpan(buckets, [a, b]) {
  return a === b ? buckets[a].id : buckets[a].id + '–' + buckets[b].id;
}

/** Conflitos de capacidade do squad, mais graves primeiro. */
export function conflitos(devs, alocacoes, buckets, limite = 4) {
  const itens = [];
  devs.forEach((dev) => {
    const oc = ocupacaoDev(dev, alocacoes, buckets);
    spans(oc, (p) => p > 1).forEach((sp) => {
      const pico = Math.max.apply(null, oc.slice(sp[0], sp[1] + 1));
      itens.push({
        nivel: 2, color: c.red, devId: dev.id,
        titulo: dev.nome + ' · ' + rotuloSpan(buckets, sp),
        texto: 'Pico de ' + Math.round(pico * 100) + '% da capacidade em ' + (sp[1] - sp[0] + 1) + ' dia(s).',
      });
    });
    spans(oc, (p) => p > 0.8 && p <= 1).forEach((sp) => {
      itens.push({
        nivel: 1, color: c.amber, devId: dev.id,
        titulo: dev.nome + ' · ' + rotuloSpan(buckets, sp),
        texto: 'Ocupação entre 80% e 100% — sem folga para chamados não previstos.',
      });
    });
  });
  return itens.sort((a, b) => b.nivel - a.nivel).slice(0, limite);
}

// ----------------------------------------------- Sugestões iniciais do modal

/** Primeiro dia útil a partir do índice `desde` (inclusive). */
export function primeiroDiaUtil(buckets, desde) {
  for (let i = Math.max(0, desde); i < buckets.length; i++) if (!ehFimDeSemana(buckets[i])) return i;
  return Math.max(0, Math.min(desde, buckets.length - 1));
}

/** Pessoa com menor ocupação na janela [inicio, fim). */
export function pessoaMaisLivre(pessoas, alocacoes, buckets, inicio, fim) {
  let melhor = null;
  let menor = Infinity;
  pessoas.forEach((p) => {
    const cap = capacidadeJanela(p, inicio, fim);
    const carga = cargaDev(alocacoes, p.id, buckets).slice(inicio, fim).reduce((s, h) => s + h, 0);
    const oc = cap ? carga / cap : Infinity;
    if (oc < menor) { menor = oc; melhor = p; }
  });
  return melhor || pessoas[0];
}

/** Validação usada pelo modal. O back-end revalida no POST/PATCH. */
export function validarJanela(dev, alocacoes, buckets, candidata) {
  const n = buckets.length;
  const outras = alocacoes.filter((a) => a.id !== candidata.id);
  const base = cargaDev(outras, dev.id, buckets);
  const nova = horasPorBucket(candidata, buckets);
  const total = base.map((h, i) => h + nova[i]);
  const janela = [];
  for (let i = candidata.bucketInicio; i < candidata.bucketInicio + candidata.duracaoBuckets; i++) {
    if (i < n) janela.push(i);
  }
  const det = janela.map((i) => ({
    bucket: buckets[i], indice: i, base: base[i], nova: nova[i],
    total: total[i], cap: capacidadeBucket(dev, i), ocupacao: total[i] / capacidadeBucket(dev, i),
  }));
  const estouros = det.filter((d) => d.ocupacao > 1);
  const apertados = det.filter((d) => d.ocupacao > 0.8 && d.ocupacao <= 1);
  const pico = det.length ? Math.max.apply(null, det.map((d) => d.ocupacao)) : 0;
  const folga = det.reduce((s, d) => s + Math.max(0, d.cap - d.total), 0);
  let nivel = 'ok';
  if (estouros.length) nivel = 'estouro';
  else if (apertados.length) nivel = 'apertado';
  return { base, nova, total, detalhes: det, estouros, apertados, pico, folga, nivel };
}
