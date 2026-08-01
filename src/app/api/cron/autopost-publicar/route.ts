import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { autopostEnabled } from "@/lib/meta/config";
import { publicarPieza } from "@/lib/meta/publish";
import { enviarAutopostFallo } from "@/lib/emails";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_INTENTOS = 3;

// Cron horario (Vercel): publica las piezas 'scheduled' cuya publish_at ya venció.
// Publicación parcial tolerante: si una red falla, guarda la que sí salió y
// reintenta solo la pendiente. Tras MAX_INTENTOS → 'failed' + email a Sebas.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!autopostEnabled()) return NextResponse.json({ skipped: "autopost_disabled" });

  const admin = createAdminClient();
  const ahora = new Date().toISOString();
  const { data: posts } = await admin
    .from("autopost_posts").select("*")
    .eq("estado", "scheduled").lte("publish_at", ahora)
    .order("publish_at", { ascending: true }).limit(20);

  const salida: { id: string; estado: string }[] = [];

  for (const post of posts ?? []) {
    const { data: cuenta } = await admin
      .from("autopost_cuentas").select("id, etiqueta, fb_page_id, ig_user_id, token_cifrado, ig_token_cifrado, activo")
      .eq("id", post.cuenta_id).maybeSingle();
    if (!cuenta || !cuenta.activo) {
      await admin.from("autopost_posts").update({ estado: "failed", ultimo_error: "cuenta no encontrada o inactiva", updated_at: ahora }).eq("id", post.id);
      salida.push({ id: post.id, estado: "failed" });
      continue;
    }

    // Bloqueo optimista para no publicar dos veces si el cron se solapa.
    const { data: locked } = await admin
      .from("autopost_posts").update({ estado: "publishing", updated_at: ahora })
      .eq("id", post.id).eq("estado", "scheduled").select("id").maybeSingle();
    if (!locked) { continue; } // otro worker lo tomó

    // Solo reintenta la red que aún no salió (evita duplicar).
    const yaFb = !!post.fb_post_id;
    const yaIg = !!post.ig_post_id;
    const quiereFb = (post.red === "facebook" || post.red === "ambas") && !!cuenta.fb_page_id;
    const quiereIg = (post.red === "instagram" || post.red === "ambas") && !!cuenta.ig_user_id && !!cuenta.ig_token_cifrado;
    let redPend: string = post.red || "ambas";
    if (post.red === "ambas") redPend = yaFb && !yaIg ? "instagram" : yaIg && !yaFb ? "facebook" : "ambas";

    const res = await publicarPieza(
      { fb_page_id: cuenta.fb_page_id, ig_user_id: cuenta.ig_user_id, token_cifrado: cuenta.token_cifrado, ig_token_cifrado: cuenta.ig_token_cifrado },
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
      await admin.from("autopost_posts").update(upd).eq("id", post.id);
      salida.push({ id: post.id, estado: "published" });
      continue;
    }

    // Falló alguna red: registra error, cuenta intento y reintenta o marca failed.
    const intentos = (post.intentos ?? 0) + 1;
    const err = res.facebook?.error || res.instagram?.error || "fallo desconocido";
    upd.intentos = intentos;
    upd.ultimo_error = String(err).slice(0, 300);
    if (intentos >= MAX_INTENTOS) {
      upd.estado = "failed";
      await admin.from("autopost_posts").update(upd).eq("id", post.id);
      await enviarAutopostFallo({ cuenta: cuenta.etiqueta, motivo: String(err).slice(0, 200) });
      salida.push({ id: post.id, estado: "failed" });
    } else {
      // Backoff exponencial: 30min, 60min, … (el cron horario lo recoge cuando vence).
      upd.estado = "scheduled";
      upd.publish_at = new Date(Date.now() + Math.pow(2, intentos) * 15 * 60 * 1000).toISOString();
      await admin.from("autopost_posts").update(upd).eq("id", post.id);
      salida.push({ id: post.id, estado: "reintento" });
    }
  }

  console.log(`cron autopost-publicar: ${JSON.stringify(salida)}`);
  return NextResponse.json({ procesados: salida.length, salida });
}
