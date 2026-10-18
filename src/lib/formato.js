export const brl = (centavos) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const dataCurta = (iso) => {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
};

export const horas = (h) => (Math.round(h * 10) / 10) + ' h';

/** 'AAAA-MM-DD' → 'DD/MM/AAAA'. */
export const dataBR = (iso) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');

/** 2160000 → '21.600,00' (para preencher um campo de texto). */
export const centavosParaTexto = (centavos) =>
  centavos === null || centavos === undefined ? '' : (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Texto digitado em reais → centavos. Aceita '21600', '21.600,50', '21600,5' e '21600.50'.
 * Devolve null se vazio e NaN se inválido.
 */
export function textoParaCentavos(texto) {
  let t = String(texto || '').replace(/[R$\s]/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ''); // '21.600' = milhar
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

const CONECTIVOS =new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

/** "Ana Ribeiro" → "AR"; "Maria da Silva Souza" → "MS"; "Ana" → "AN". */
export function gerarIniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter((p) => p && !CONECTIVOS.has(p.toLowerCase()));
  if (!partes.length) return '';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
