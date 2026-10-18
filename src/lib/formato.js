export const brl = (centavos) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const dataCurta = (iso) => {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
};

export const horas = (h) => (Math.round(h * 10) / 10) + ' h';
