import { META_GRAPH } from "@/lib/meta/config";
import { descifrarToken } from "@/lib/crypto-tokens";

/**
 * Publicación en Meta Graph API. Instagram exige un flujo en 2 pasos (crear
 * contenedor → publicar); Facebook publica directo. La API NO hace cross-post
 * FB↔IG (eso es la UI de Business Suite): aquí hacemos fan-out explícito.
 * Solo servidor.
 */

const MAX_IG_BYTES = 8 * 1024 * 1024; // IG: imágenes <= 8 MB

export interface ResultadoRed { ok: boolean; id?: string; url?: string; error?: string }
export interface ResultadoPublicacion { facebook?: ResultadoRed; instagram?: ResultadoRed }

export interface CuentaPublicable {
  fb_page_id: string | null;
  ig_user_id: string | null;      // IG Business Account ID (~17 díg., de instagram_business_account)
  token_cifrado: string;          // page token FB — publica en FB Y en la IG vinculada
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Construye el error tras loguear el body crudo de Meta (code/subcode/fbtrace). */
function graphError(verbo: string, base: string, path: string, status: number, json: unknown): Error {
  const e = (json as { error?: Record<string, unknown> })?.error || {};
  // El body crudo suele traer más que el mensaje resumido (error_subcode,
  // error_user_title/msg, fbtrace_id) — clave para diagnosticar permisos IG.
  console.error(`Graph ${verbo} ${base}${path} [${status}]:`, JSON.stringify(e));
  const cod = e.code ? ` (code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ""})` : "";
  return new Error(`${(e.message as string) || `Graph ${verbo} ${path} (${status})`}${cod}`);
}

async function graphPost<T>(path: string, params: Record<string, string>, base = META_GRAPH): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const json = await res.json();
  if (!res.ok || json?.error) throw graphError("POST", base, path, res.status, json);
  return json as T;
}

async function graphGet<T>(path: string, params: Record<string, string>, base = META_GRAPH): Promise<T> {
  const res = await fetch(`${base}${path}?${new URLSearchParams(params).toString()}`, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json?.error) throw graphError("GET", base, path, res.status, json);
  return json as T;
}

/** Chequeo ligero de la imagen para IG (tipo + tamaño). No valida aspecto. */
export async function validarImagenParaIG(imageUrl: string): Promise<string | null> {
  if (!/^https:\/\//i.test(imageUrl)) return "La imagen debe servirse por HTTPS público.";
  try {
    const head = await fetch(imageUrl, { method: "HEAD" });
    const tipo = head.headers.get("content-type") || "";
    const len = Number(head.headers.get("content-length") || "0");
    if (tipo && !/image\/(jpe?g|png)/i.test(tipo)) return `Formato no soportado por IG: ${tipo}`;
    if (len && len > MAX_IG_BYTES) return "La imagen supera los 8 MB permitidos por IG.";
  } catch { /* si el HEAD falla, dejamos que Meta valide al crear el contenedor */ }
  return null;
}

/**
 * Publica en Instagram vía graph.facebook.com con el PAGE TOKEN (setup
 * "Instagram API with Facebook Login"): contenedor → poll → media_publish.
 * `igUserId` es la IG Business Account ID (~17 díg.) vinculada a la Página.
 */
export async function publicarEnInstagram(
  igUserId: string, pageToken: string, imageUrl: string, caption: string,
): Promise<ResultadoRed> {
  try {
    const invalida = await validarImagenParaIG(imageUrl);
    if (invalida) return { ok: false, error: invalida };

    const cont = await graphPost<{ id: string }>(`/${igUserId}/media`, {
      image_url: imageUrl, caption, access_token: pageToken,
    });

    // Poll del contenedor hasta FINISHED (o ERROR). ~60s máx.
    let estado = "";
    for (let i = 0; i < 30; i++) {
      await dormir(2000);
      const st = await graphGet<{ status_code: string }>(`/${cont.id}`, { fields: "status_code", access_token: pageToken });
      estado = st.status_code;
      if (estado === "FINISHED") break;
      if (estado === "ERROR" || estado === "EXPIRED") return { ok: false, error: `Contenedor IG en estado ${estado}` };
    }
    if (estado !== "FINISHED") return { ok: false, error: "El contenedor de IG no quedó listo a tiempo." };

    const pub = await graphPost<{ id: string }>(`/${igUserId}/media_publish`, {
      creation_id: cont.id, access_token: pageToken,
    });

    let url: string | undefined;
    try {
      const perma = await graphGet<{ permalink: string }>(`/${pub.id}`, { fields: "permalink", access_token: pageToken });
      url = perma.permalink;
    } catch { /* permalink es opcional */ }

    return { ok: true, id: pub.id, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fallo IG" };
  }
}

/** Publica en una Página de Facebook: /photos si hay imagen, /feed si no. */
export async function publicarEnFacebook(
  pageId: string, token: string, imageUrl: string | null, message: string,
): Promise<ResultadoRed> {
  try {
    if (imageUrl) {
      const r = await graphPost<{ id: string; post_id?: string }>(`/${pageId}/photos`, {
        url: imageUrl, message, access_token: token,
      });
      const postId = r.post_id || r.id;
      return { ok: true, id: postId, url: `https://www.facebook.com/${postId}` };
    }
    const r = await graphPost<{ id: string }>(`/${pageId}/feed`, { message, access_token: token });
    return { ok: true, id: r.id, url: `https://www.facebook.com/${r.id}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fallo FB" };
  }
}

/**
 * Publica una pieza en la(s) red(es) indicadas de una cuenta (fan-out).
 * `red`: 'facebook' | 'instagram' | 'ambas'. IG requiere imagen.
 */
export async function publicarPieza(
  cuenta: CuentaPublicable,
  pieza: { texto: string; imagenUrl: string | null; red: string },
): Promise<ResultadoPublicacion> {
  const out: ResultadoPublicacion = {};
  const quiere = (r: string) => pieza.red === r || pieza.red === "ambas";
  // El MISMO Page token publica en FB y en la IG vinculada (graph.facebook.com).
  const pageToken = descifrarToken(cuenta.token_cifrado);

  if (quiere("facebook") && cuenta.fb_page_id) {
    out.facebook = await publicarEnFacebook(cuenta.fb_page_id, pageToken, pieza.imagenUrl, pieza.texto);
  }
  if (quiere("instagram") && cuenta.ig_user_id) {
    out.instagram = pieza.imagenUrl
      ? await publicarEnInstagram(cuenta.ig_user_id, pageToken, pieza.imagenUrl, pieza.texto)
      : { ok: false, error: "Instagram requiere una imagen." };
  }
  return out;
}
