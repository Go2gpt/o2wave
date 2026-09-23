/**
 * Sonido de confirmación al publicar con éxito ("✓ publicado") + vibración suave.
 * Identidad sonora de o2Wave (el mismo tono que en los Reels). Tolerante: si el
 * navegador bloquea el audio o no soporta vibración, no pasa nada.
 * Solo cliente. Llamar SIEMPRE dentro de un handler de clic del usuario (evita el
 * bloqueo de autoplay del navegador).
 */
export function sonarPublicado(volumen = 0.6): void {
  try {
    const a = new Audio("/sounds/publicado.mp3");
    a.volume = volumen;
    void a.play().catch(() => {});
  } catch { /* audio no disponible */ }
  try {
    navigator.vibrate?.(60);
  } catch { /* vibración no soportada */ }
}
