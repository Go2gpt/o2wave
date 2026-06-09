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

/**
 * Quita hashtags (#palabra) del cuerpo de un texto: en el pack los hashtags se
 * muestran aparte, en su propio bloque. Limpia los espacios/saltos que quedan.
 * Sin dependencias de servidor → seguro de usar en cliente y en server.
 */
export function quitarHashtags(texto: string): string {
  return texto
    .replace(/#[0-9A-Za-zÀ-ÿ_]+/g, '')  // elimina #hashtags (incluye acentos)
    .replace(/[ \t]{2,}/g, ' ')          // espacios dobles que quedan
    .replace(/[ \t]+\n/g, '\n')          // espacios al final de línea
    .replace(/\n{3,}/g, '\n\n')          // colapsa líneas en blanco de más
    .trim();
}
