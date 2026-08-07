/**
 * FUENTE ÚNICA DE VERDAD del aspect ratio de imagen por red social.
 *
 * Toda imagen se genera en el tamaño de la red solicitada (particular / empresa /
 * ONG). Antes esta lógica estaba duplicada (post suelto en pollImage.ts + pack en
 * packProcessor.ts) y divergió: el pack seguía generando Instagram en 1:1. Ahora
 * ambos flujos llaman aquí.
 *
 * Medidas canónicas por red (listado oficial 4 redes que publicamos):
 *   Instagram feed  → 4:5  (1080×1350)   · Instagram Story → 9:16
 *   Facebook        → 4:5  (1080×1350)   — MISMA medida que Instagram
 *   LinkedIn        → 1:1  (1200×1200)
 *   X (Twitter)     → 16:9 (1600×900)
 *   TikTok          → 9:16 (vertical)
 *   WhatsApp / resto → 1:1
 *
 * Acepta la red en cualquier caja ("Instagram" o "instagram") para servir tanto al
 * flujo del post suelto (RedSocial capitalizado) como al del pack (tipo en minúsculas).
 */
export function aspectPorRed(red: string, formato?: string | null): string {
  const r = (red || "").toLowerCase();
  if (r === "instagram") return formato === "Story 9:16" ? "9:16" : "4:5";
  if (r === "facebook") return "4:5";              // misma medida que IG (1080×1350)
  if (r === "linkedin") return "1:1";              // 1200×1200
  if (r === "x" || r === "twitter") return "16:9"; // 1600×900
  if (r === "tiktok") return "9:16";               // vertical
  return "1:1"; // WhatsApp y resto
}

/**
 * paddingTop (CSS) para un recuadro de preview con la proporción de la red
 * (alto/ancho · 100%). Misma fuente única, para que los previews no vuelvan a
 * asumir cuadrado cuando cambia la medida de una red.
 */
export function padTopPorRed(red: string, formato?: string | null): string {
  const ar = aspectPorRed(red, formato);
  return ar === "4:5" ? "125%" : ar === "16:9" ? "56.25%" : ar === "9:16" ? "177.78%" : "100%";
}
