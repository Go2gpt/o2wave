import type { SupabaseClient } from "@supabase/supabase-js";
import { publicarPieza } from "@/lib/meta/publish";

/**
 * Publica UNA pieza de autopost ya programada (estado 'scheduled') de forma
 * inline. Misma semántica que el worker C5 (bloqueo optimista, publicación
 * parcial FB/IG tolerante, reintentos con tope), pero para una sola pieza —
 * lo usa el botón "Publicar ahora". No sustituye a C5 (que sigue corriendo).
 * Solo servidor.
 */

const MAX_INTENTOS = 3;

export interface ResultadoPublicacionPost {
  estado: string;
  fb_post_url?: string | null;
  ig_post_url?: string | null;
  error?: string;
}

export async function publicarPostAutopost(admin: SupabaseClient, postId: string): Promise<ResultadoPublicacionPost> {
  const { data: post } = await admin.from("autopost_posts").select("*").eq("id", postId).maybeSingle();
  if (!post) return { estado: "failed", error: "Pieza no encontrada" };

  const { data: cuenta } = await admin.from("autopost_cuentas")
    .select("id, etiqueta, fb_page_id, ig_user_id, token_cifrado, activo").eq("id", post.cuenta_id).maybeSingle();
  const ahora = new Date().toISOString();
  if (!cuenta || !cuenta.activo) {
    await admin.from("autopost_posts").update({ estado: "failed", ultimo_error: "cuenta no encontrada o inactiva", updated_at: ahora }).eq("id", postId);
    return { estado: "failed", error: "Cuenta no encontrada o inactiva" };
  }

  // Bloqueo optimista: solo publica si está 'scheduled' (evita doble publicación
  // si el cron C5 la toma a la vez).
  const { data: locked } = await admin.from("autopost_posts")
    .update({ estado: "publishing", updated_at: ahora }).eq("id", postId).eq("estado", "scheduled").select("id").maybeSingle();
  if (!locked) return { estado: post.estado, error: "La pieza no está en estado programado (¿ya se está publicando?)." };

  const yaFb = !!post.fb_post_id;
  const yaIg = !!post.ig_post_id;
  const quiereFb = (post.red === "facebook" || post.red === "ambas") && !!cuenta.fb_page_id;
  const quiereIg = (post.red === "instagram" || post.red === "ambas") && !!cuenta.ig_user_id;
  let redPend: string = post.red || "ambas";
  if (post.red === "ambas") redPend = yaFb && !yaIg ? "instagram" : yaIg && !yaFb ? "facebook" : "ambas";

  const res = await publicarPieza(
    { fb_page_id: cuenta.fb_page_id, ig_user_id: cuenta.ig_user_id, token_cifrado: cuenta.token_cifrado },
    { texto: post.texto, imagenUrl: post.imagen_url, red: redPend },
  );

  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (res.facebook?.ok) { upd.fb_post_id = res.facebook.id; upd.fb_post_url = res.facebook.url; }
  if (res.instagram?.ok) { upd.ig_post_id = res.instagram.id; upd.ig_post_url = res.instagram.url; }

  const fbDone = yaFb || !!res.facebook?.ok;
  const igDone = yaIg || !!res.instagram?.ok;
  const completo = (!quiereFb || fbDone) && (!quiereIg || igDone) && (quiereFb || quiereIg);

  if (completo) {
    upd.estado = "published";
    upd.publicado_at = new Date().toISOString();
    await admin.from("autopost_posts").update(upd).eq("id", postId);
    return {
      estado: "published",
      fb_post_url: (upd.fb_post_url as string) ?? post.fb_post_url ?? null,
      ig_post_url: (upd.ig_post_url as string) ?? post.ig_post_url ?? null,
    };
  }

  // Falló alguna red: registra error e intento. Si no agota, queda 'scheduled'
  // con publish_at vencido → el cron C5 lo reintentará.
  const intentos = (post.intentos ?? 0) + 1;
  const err = res.facebook?.error || res.instagram?.error || "fallo desconocido";
  upd.intentos = intentos;
  upd.ultimo_error = String(err).slice(0, 300);
  if (intentos >= MAX_INTENTOS) {
    upd.estado = "failed";
  } else {
    upd.estado = "scheduled";
    upd.publish_at = new Date().toISOString();
  }
  await admin.from("autopost_posts").update(upd).eq("id", postId);
  return { estado: upd.estado as string, error: String(err) };
}
