// IDs gerados na aplicação (não no banco), para o schema funcionar igual no Oracle.
export function novoId() {
  if (globalThis.crypto && globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  // Reserva para navegadores sem randomUUID (ex.: site aberto por http num IP da rede).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
