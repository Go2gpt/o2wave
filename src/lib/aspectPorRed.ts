/**
 * FUENTE ÚNICA DE VERDAD del aspect ratio de imagen por red social.
 *
 * Toda imagen se genera en el tamaño de la red solicitada (particular / empresa /
 * ONG). Antes esta lógica estaba duplicada (post suelto en pollImage.ts + pack en
 * packProcessor.ts) y divergió: el pack seguía generando Instagram en 1:1. Ahora
 * ambos flujos llaman aquí.
 *
 * Medidas canónicas por red (04-ago):
 *   Instagram feed  → 4:5  (1080×1350)   · Instagram Story → 9:16
 *   Facebook        → 16:9 (landscape; el 1,91:1 de 1200×630 no es un ratio que
 *                            soporte el generador, 16:9 es el landscape más cercano)
 *   LinkedIn        → 16:9 (post horizontal)
 *   TikTok          → 9:16 (vertical)
 *   WhatsApp / resto → 1:1
 *
 * Acepta la red en cualquier caja ("Instagram" o "instagram") para servir tanto al
 * flujo del post suelto (RedSocial capitalizado) como al del pack (tipo en minúsculas).
 */
export function aspectPorRed(red: string, formato?: string | null): string {
  const r = (red || "").toLowerCase();
  if (r === "instagram") return formato === "Story 9:16" ? "9:16" : "4:5";
  if (r === "facebook" || r === "linkedin") return "16:9";
  if (r === "tiktok") return "9:16";
  return "1:1"; // WhatsApp y resto
}
