export function limpiarMarkdown(texto: string): string {
  return texto
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^---$/gm, '')
    .replace(/^#{1,6}\s/gm, '')
    .trim();
}

/**
 * Regla de marca: "O2" (O mayúscula seguida de 2) siempre va en minúscula → "o2".
 * Solo afecta a la O cuando va inmediatamente delante del 2.
 */
export function normalizarMarca(texto: string): string {
  return texto.replace(/O2/g, 'o2');
}
