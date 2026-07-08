import { META_GRAPH, META_OAUTH_DIALOG, META_SCOPES } from "@/lib/meta/config";

/**
 * Flujo OAuth de Meta: construir la URL de autorización, canjear el code por
 * un user token de larga duración y listar las Páginas de FB (con su cuenta
 * IG business vinculada) que el usuario administra. Solo servidor.
 */

/** Llamada GET a la Graph API. Lanza con el mensaje de error de Meta si falla. */
async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${META_GRAPH}${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json?.error) {
    throw new Error(json?.error?.message || `Graph API error (${res.status})`);
  }
  return json as T;
}

/**
 * URL a la que redirigimos a Sebas para autorizar la app. Con Business Login
 * (configId) los permisos/assets los define la configuración → se pasa
 * config_id y NO scope. Sin configId, cae al modo scope clásico.
 */
export function buildAuthorizeUrl(state: string, redirectUri: string, configId?: string): string {
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID || "",
    redirect_uri: redirectUri,
    state,
    response_type: "code",
  });
  if (configId) p.set("config_id", configId);
  else p.set("scope", META_SCOPES.join(","));
  return `${META_OAUTH_DIALOG}?${p.toString()}`;
}

/** Canjea el `code` del callback por un user access token (corta duración). */
export async function exchangeCodeForUserToken(code: string, redirectUri: string): Promise<string> {
  const data = await graphGet<{ access_token: string }>("/oauth/access_token", {
    client_id: process.env.META_APP_ID || "",
    client_secret: process.env.META_APP_SECRET || "",
    redirect_uri: redirectUri,
    code,
  });
  return data.access_token;
}

/** Convierte el user token corto en uno de larga duración (~60 días). */
export async function toLongLivedUserToken(shortToken: string): Promise<string> {
  const data = await graphGet<{ access_token: string }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID || "",
    client_secret: process.env.META_APP_SECRET || "",
    fb_exchange_token: shortToken,
  });
  return data.access_token;
}

export interface PaginaConectada {
  fb_page_id: string;
  fb_page_nombre: string;
  page_token: string;      // page access token (hereda larga duración del user token)
  ig_user_id: string | null;
  ig_username: string | null;
}

interface AccountsResponse {
  data?: Array<{
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: { id: string; username?: string };
  }>;
}

/**
 * Lista las Páginas de FB que administra el usuario, con su page token y la
 * cuenta IG business vinculada (si la hay). Los page tokens derivados de un
 * user token de larga duración son a su vez de larga duración.
 */
export async function listarPaginasConIG(userToken: string): Promise<PaginaConectada[]> {
  const data = await graphGet<AccountsResponse>("/me/accounts", {
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: userToken,
  });
  return (data.data || []).map((p) => ({
    fb_page_id: p.id,
    fb_page_nombre: p.name,
    page_token: p.access_token,
    ig_user_id: p.instagram_business_account?.id || null,
    ig_username: p.instagram_business_account?.username || null,
  }));
}
