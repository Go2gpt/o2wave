/**
 * URL base de producción de o2Wave. SIEMPRE con www: el dominio sin www
 * (https://o2wave.app) responde un 308 hacia www, y servicios como Stripe o
 * Resend no siguen esa redirección. Configurable con NEXT_PUBLIC_SITE_URL;
 * por defecto https://www.o2wave.app.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.o2wave.app").replace(/\/+$/, "");
