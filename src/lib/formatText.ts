export function limpiarMarkdown(texto: string): string {
  return texto
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^---$/gm, '')
    .replace(/^#{1,6}\s/gm, '')
    .trim();
}
