import { SITE_URL } from "@/lib/siteUrl";

/**
 * Configuración de la integración con Meta (Facebook + Instagram) para la
 * auto-publicación Fase 1 (uso interno Generación o2). Solo servidor.
 */

export const META_GRAPH_VERSION = "v20.0";
export const META_GRAPH = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
export const META_OAUTH_DIALOG = `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`;

/* --- Instagram Business Login (Fase 1a.2): OAuth y Graph propios de IG --- */
export const GRAPH_INSTAGRAM = "https://graph.instagram.com";
export const IG_OAUTH_AUTHORIZE = "https://api.instagram.com/oauth/authorize";
export const IG_OAUTH_TOKEN = "https://api.instagram.com/oauth/access_token";
export const IG_SCOPES = ["instagram_business_basic", "instagram_business_content_publish"];

// .trim() defensivo: un espacio/salto de línea al pegar la env en Vercel rompe
// el intercambio code→token (Instagram exige redirect_uri/secret byte-a-byte y
// devuelve un error genérico de "redirect_uri" aunque el fallo sea el secret).
/** redirect_uri del OAuth de Instagram (debe coincidir con la Meta App). */
export function metaIgRedirectUri(): string {
  return (process.env.META_IG_REDIRECT_URI || `${SITE_URL}/api/meta/oauth/instagram-callback`).trim();
}
/** App ID para el flujo Instagram (puede diferir del de FB → fallback al de FB). */
export function metaIgAppId(): string {
  return (process.env.META_IG_APP_ID || process.env.META_APP_ID || "").trim();
}
/** App Secret para el flujo Instagram (fallback al de FB). */
export function metaIgAppSecret(): string {
  return (process.env.META_IG_APP_SECRET || process.env.META_APP_SECRET || "").trim();
}

/**
 * Permisos del OAuth de Facebook Login (setup "Instagram API with Facebook
 * Login"). En Development, con el usuario admin/tester, están disponibles sin
 * App Review. instagram_basic + instagram_content_publish permiten publicar en
 * la cuenta IG vinculada a la Página usando el PAGE TOKEN (vía graph.facebook.com)
 * — la vía estable, sin depender del OAuth separado de Instagram Login.
 */
export const META_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
];

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
