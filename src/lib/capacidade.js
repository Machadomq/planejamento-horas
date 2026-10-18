import { c } from '../theme.js';

export const CAP_SEMANA_PADRAO = 10;
export const CAP_MES_PADRAO = 180;

export function capacidadeMensal(dev) {
  return (dev.capacidade && dev.capacidade.horasMes) || CAP_MES_PADRAO;
}

export function ehFimDeSemana(bucket) {
  const dow = new Date(bucket.inicio + 'T12:00:00').getDay();
  return dow === 0 || dow === 6;
}

/** Máscara de dias úteis (não fim de semana) de uma janela dentro do período. */
function mascaraUtil(buckets, bucketInicio, duracaoBuckets) {
  return Array.from({ length: duracaoBuckets }, (_, i) => {
    const b = buckets[bucketInicio + i];
    return b ? !ehFimDeSemana(b) : false;
  });
}

/** Pesos de distribuição das horas ao longo da janela, ignorando fins de semana. Somam 1. */
export function pesos(distribuicao, mascara) {
  const n = mascara.length;
  const ativos = mascara.filter(Boolean).length || 1;
  if (distribuicao === 'frontLoaded') {
    const w = mascara.map((util, i) => (util ? n - i : 0));
    const s = w.reduce((a, b) => a + b, 0) || 1;
    return w.map((x) => x / s);
  }
  return mascara.map((util) => (util ? 1 / ativos : 0));
}

/** Horas que uma alocação joga em cada bucket do período. */
export function horasPorBucket(alocacao, buckets) {
  const nBuckets = buckets.length;
  const out = Array(nBuckets).fill(0);
  const mascara = mascaraUtil(buckets, alocacao.bucketInicio, alocacao.duracaoBuckets);
  if (alocacao.distribuicao === 'manual' && alocacao.pesos && alocacao.pesos.length === alocacao.duracaoBuckets) {
    for (let i = 0; i < alocacao.duracaoBuckets; i++) {
      const b = alocacao.bucketInicio + i;
      if (b >= 0 && b < nBuckets && mascara[i]) out[b] += alocacao.pesos[i];
    }
    return out;
  }
  const p = pesos(alocacao.distribuicao, mascara);
  for (let i = 0; i < alocacao.duracaoBuckets; i++) {
    const b = alocacao.bucketInicio + i;
    if (b >= 0 && b < nBuckets) out[b] += alocacao.horasEstimadas * p[i];
  }
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
