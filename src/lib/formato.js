export const brl = (centavos) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const dataCurta = (iso) => {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
};

export const horas = (h) => (Math.round(h * 10) / 10) + ' h';

const CONECTIVOS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);

/** "Ana Ribeiro" → "AR"; "Maria da Silva Souza" → "MS"; "Ana" → "AN". */
export function gerarIniciais(nome) {
  const partes = String(nome || '').trim().split(/\s+/).filter((p) => p && !CONECTIVOS.has(p.toLowerCase()));
  if (!partes.length) return '';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
