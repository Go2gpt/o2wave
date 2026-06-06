import { Resend } from "resend";

export const FROM_EMAIL = "O2Wave <noreply@generacion-o2.org>";

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
