import { Resend } from "resend";

export const FROM_EMAIL = "o2Wave <noreply@generacion-o2.org>";

// Emails de verificación de ONGs: los firma Sebastian (Generación o2). Mismo
// dominio verificado en Resend (generacion-o2.org), así que está autorizado.
export const FROM_VERIFICACION = "Sebastian Ferragut · o2Wave <o2wave.app@generacion-o2.org>";
export const REPLY_TO_VERIFICACION = "o2wave.app@generacion-o2.org";

/**
 * Devuelve un cliente Resend inicializado. Valida la env var en runtime
 * (al llamar), no al importar el módulo, para no romper el build cuando
 * RESEND_API_KEY no está presente en el entorno de compilación.
 */
export function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está configurada en el entorno.");
  }
  return new Resend(apiKey);
}
