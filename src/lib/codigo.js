// Código das atividades: número sequencial (1, 2, 3…) gerado automaticamente ao criar.
// Fica guardado como texto no banco; códigos antigos não numéricos (ex.: "TCK-4312") são aceitos.

const numero = (codigo) => (/^\d+$/.test(String(codigo || '')) ? Number(codigo) : null);

/** Próximo código: maior número já usado + 1 (começa em 1). */
export function proximoCodigo(codigos) {
  const nums = codigos.map(numero).filter((n) => n !== null);
  return String(nums.length ? Math.max(...nums) + 1 : 1);
}

/** Ordena 2 antes de 10 (e numéricos antes dos antigos com texto). */
export const compararCodigos = (a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true });

/** Como mostrar na tela: "12" vira "#12" (para não parecer horas ou quantidade). */
export const rotuloCodigo = (codigo) => (numero(codigo) !== null ? '#' + codigo : codigo || '');
