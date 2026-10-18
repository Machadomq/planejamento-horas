// Datas como texto ISO 'AAAA-MM-DD' (o mesmo formato que o banco devolve).
// As contas são feitas ao meio-dia, horário local, para o fuso não "pular" um dia.

export const DIAS_PERIODO = 84;
export const SEMANAS_ANTES = 2;

const pad = (n) => String(n).padStart(2, '0');
const paraData = (iso) => new Date(iso + 'T12:00:00');
const paraISO = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

export function hojeISO() {
  return paraISO(new Date());
}

export function somarDias(iso, dias) {
  const d = paraData(iso);
  d.setDate(d.getDate() + dias);
  return paraISO(d);
}

/** Dias de `a` até `b` (b - a). */
export function diasEntre(a, b) {
  return Math.round((paraData(b) - paraData(a)) / 86400000);
}

export function ehFimDeSemanaISO(iso) {
  const dow = paraData(iso).getDay();
  return dow === 0 || dow === 6;
}

/** Segunda-feira da semana de `iso` (semana de segunda a domingo). */
export function segundaDaSemana(iso) {
  const dow = paraData(iso).getDay();
  return somarDias(iso, dow === 0 ? -6 : 1 - dow);
}

/** O Gantt começa na segunda-feira de 2 semanas atrás. */
export function inicioPeriodo(hoje = hojeISO()) {
  return somarDias(segundaDaSemana(hoje), -7 * SEMANAS_ANTES);
}

export function gerarBuckets(inicioISO, dias = DIAS_PERIODO) {
  return Array.from({ length: dias }, (_, i) => {
    const iso = somarDias(inicioISO, i);
    return { indice: i, id: iso.slice(8, 10) + '/' + iso.slice(5, 7), inicio: iso };
  });
}

export function periodoAtual(hoje = hojeISO()) {
  const inicio = inicioPeriodo(hoje);
  return { inicio, hoje, buckets: gerarBuckets(inicio), bucketAtual: diasEntre(inicio, hoje) };
}

// ---------------------------------------------------------------------
// Conversão data ⇄ coluna do Gantt. ÚNICO lugar onde isso acontece:
// o banco guarda datas; as telas e lib/capacidade.js trabalham com índices.
// ---------------------------------------------------------------------

/** { dataInicio, dataFim } → { bucketInicio, duracaoBuckets } relativo ao início do período. */
export function datasParaBuckets(dataInicio, dataFim, inicioISO) {
  return {
    bucketInicio: diasEntre(inicioISO, dataInicio),
    duracaoBuckets: diasEntre(dataInicio, dataFim) + 1,
  };
}

/** { bucketInicio, duracaoBuckets } → { dataInicio, dataFim } (fim inclusivo). */
export function bucketsParaDatas(bucketInicio, duracaoBuckets, inicioISO) {
  return {
    dataInicio: somarDias(inicioISO, bucketInicio),
    dataFim: somarDias(inicioISO, bucketInicio + duracaoBuckets - 1),
  };
}
