import { SITE_URL } from "@/lib/siteUrl";

/**
 * Configuración de la integración con Meta (Facebook + Instagram) para la
 * auto-publicación Fase 1 (uso interno Generación o2). Solo servidor.
 */

export const META_GRAPH_VERSION = "v20.0";
export const META_GRAPH = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
export const META_OAUTH_DIALOG = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`;

/** Permisos que pedimos en el OAuth (publicar en Páginas FB + IG business). */
export const META_SCOPES = [
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_content_publish",
  "instagram_basic",
  "business_management",
];

/** Vida estimada de un page token de larga duración (~60 días). */
export const TOKEN_TTL_DIAS = 60;

/** ¿Está encendido el sistema de autopost? Interruptor global (criterio #6). */
export function autopostEnabled(): boolean {
  const v = (process.env.AUTOPOST_ENABLED || "").toLowerCase();
  return v === "1" || v === "true";
}

/** ¿Están las credenciales de la Meta App configuradas? */
export function metaOAuthConfigurado(): boolean {
  return !!process.env.META_APP_ID && !!process.env.META_APP_SECRET;
}

/**
 * redirect_uri del OAuth. DEBE coincidir EXACTAMENTE con la registrada en la
 * Meta App. Configurable por env (META_REDIRECT_URI); por defecto usa SITE_URL.
 */
export function metaRedirectUri(): string {
  return process.env.META_REDIRECT_URI || `${SITE_URL}/api/meta/oauth/callback`;
}
