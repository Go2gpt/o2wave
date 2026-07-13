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

interface IgPaginaResponse {
  instagram_business_account?: { id: string; username?: string };
  connected_instagram_account?: { id: string; username?: string };
}

/**
 * Resuelve la cuenta IG vinculada a una Página consultándola DIRECTAMENTE con
 * el page token. Con Business Login / System User, /me/accounts no expande de
 * forma fiable instagram_business_account; esta consulta por página sí. Prueba
 * instagram_business_account y, como fallback, connected_instagram_account.
 */
async function resolverIgDePagina(pageId: string, pageToken: string): Promise<{ id: string | null; username: string | null }> {
  try {
    const r = await graphGet<IgPaginaResponse>(`/${pageId}`, {
      fields: "instagram_business_account{id,username},connected_instagram_account{id,username}",
      access_token: pageToken,
    });
    const ig = r.instagram_business_account || r.connected_instagram_account;
    return { id: ig?.id || null, username: ig?.username || null };
  } catch (e) {
    console.error(`resolverIgDePagina(${pageId}):`, e instanceof Error ? e.message : e);
    return { id: null, username: null };
  }
}

/**
 * Lista las Páginas de FB que administra el usuario, con su page token y la
 * cuenta IG business vinculada. Si /me/accounts no trae el IG (habitual con
 * Business Login/System User), se resuelve por página con el page token.
 */
export async function listarPaginasConIG(userToken: string): Promise<PaginaConectada[]> {
  const data = await graphGet<AccountsResponse>("/me/accounts", {
    fields: "id,name,access_token,instagram_business_account{id,username}",
    access_token: userToken,
  });
  const paginas: PaginaConectada[] = [];
  for (const p of data.data || []) {
    let igId = p.instagram_business_account?.id || null;
    let igUser = p.instagram_business_account?.username || null;
    // Resolución por página (con page token) si /me/accounts no expandió el IG
    // o no trajo el username.
    if (!igId || !igUser) {
      const ig = await resolverIgDePagina(p.id, p.access_token);
      igId = igId || ig.id;
      igUser = igUser || ig.username;
    }
    paginas.push({
      fb_page_id: p.id,
      fb_page_nombre: p.name,
      page_token: p.access_token,
      ig_user_id: igId,
      ig_username: igUser,
    });
  }
  return paginas;
}
