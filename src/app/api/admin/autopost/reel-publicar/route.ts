import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { publicarReel, type CuentaPublicable } from "@/lib/meta/publish";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // publicar un Reel implica procesado de vídeo en Meta

// Publica el Reel ya generado (video_url + caption) en la cuenta indicada, con un
// clic y sin copiar/pegar texto. Solo admin.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { cuenta_id, video_url, caption } = await request.json().catch(() => ({})) as {
    cuenta_id?: string; video_url?: string; caption?: string;
  };
  if (!cuenta_id || !video_url || !caption) return NextResponse.json({ error: "Faltan datos (cuenta, vídeo o caption)" }, { status: 400 });

  const { data: cuenta } = await auth.admin
    .from("autopost_cuentas").select("fb_page_id, ig_user_id, token_cifrado").eq("id", cuenta_id).maybeSingle();
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  try {
    const resultado = await publicarReel(cuenta as CuentaPublicable, { videoUrl: video_url, caption, red: "ambas" });
    const ig = resultado.instagram, fb = resultado.facebook;
    const algunOk = ig?.ok || fb?.ok;
    // Detalle por red (para diagnosticar): IG y FB con su ok/error.
    const detalle = [
      ig ? `IG: ${ig.ok ? "publicado ✓" : ig.error}` : "IG: no intentado",
      fb ? `FB: ${fb.ok ? "publicado ✓" : fb.error}` : "FB: no intentado",
    ].join(" · ");
    if (!algunOk) {
      return NextResponse.json({ error: detalle }, { status: 502 });
    }
    return NextResponse.json({ ok: true, url: ig?.url || fb?.url, detalle });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al publicar el Reel" }, { status: 500 });
  }
}
