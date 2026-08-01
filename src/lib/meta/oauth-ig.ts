import { GRAPH_INSTAGRAM, IG_OAUTH_AUTHORIZE, IG_OAUTH_TOKEN, IG_SCOPES, metaIgAppId, metaIgAppSecret } from "@/lib/meta/config";

/**
 * Instagram Business Login (Fase 1a.2). Flujo OAuth SEPARADO del de Facebook:
 * endpoint api.instagram.com para autorizar/canjear, graph.instagram.com para
 * long-lived + refresh. El token IG caduca a ~60 días. Solo servidor.
 */

const DEFAULT_TTL_S = 60 * 24 * 3600; // 60 días

/** URL del diálogo de autorización de Instagram. */
export function buildIgAuthorizeUrl(state: string, redirectUri: string): string {
  const p = new URLSearchParams({
    client_id: metaIgAppId(),
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: IG_SCOPES.join(","),
  });
  return `${IG_OAUTH_AUTHORIZE}?${p.toString()}`;
}

/** Canjea el code por un token de corta duración (POST form). Devuelve token + ig_user_id. */
export async function exchangeIgCodeForToken(code: string, redirectUri: string): Promise<{ accessToken: string; userId: string }> {
  const body = new URLSearchParams({
    client_id: metaIgAppId(),
    client_secret: metaIgAppSecret(),
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(IG_OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json?.error_type || json?.error) {
    throw new Error(json?.error_message || json?.error?.message || `IG token error (${res.status})`);
  }
  return { accessToken: json.access_token, userId: String(json.user_id) };
}

/** Intercambia el token corto por uno de larga duración (~60 días). */
export async function toLongLivedIgToken(shortToken: string): Promise<{ token: string; expiresIn: number }> {
  const p = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: metaIgAppSecret(), access_token: shortToken });
  const res = await fetch(`${GRAPH_INSTAGRAM}/access_token?${p.toString()}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json?.error) throw new Error(json?.error?.message || `IG long-lived error (${res.status})`);
  return { token: json.access_token, expiresIn: json.expires_in || DEFAULT_TTL_S };
}

/** Refresca un IG long-lived token (renueva otros ~60 días). */
export async function refreshIgToken(currentToken: string): Promise<{ token: string; expiresIn: number }> {
  const p = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: currentToken });
  const res = await fetch(`${GRAPH_INSTAGRAM}/refresh_access_token?${p.toString()}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json?.error) throw new Error(json?.error?.message || `IG refresh error (${res.status})`);
  return { token: json.access_token, expiresIn: json.expires_in || DEFAULT_TTL_S };
}

/** Username de la cuenta IG (best-effort). */
export async function fetchIgUsername(igUserId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`${GRAPH_INSTAGRAM}/${igUserId}?fields=username&access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
    const json = await res.json();
    return json?.username || null;
  } catch { return null; }
}
