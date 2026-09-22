import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { finalizarReel } from "@/lib/autopost/reel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// FASE 2 del Reel: el cliente consulta hasta que el vídeo está listo. Mientras,
// {estado:"generando"}. Cuando está listo, compone (texto+música) y sube el MP4
// final → {estado:"listo", video_url}. Solo admin.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { cuenta_id, video_id, music_id, caption } = await request.json().catch(() => ({})) as {
    cuenta_id?: string; video_id?: string; music_id?: string | null; caption?: string;
  };
  if (!cuenta_id || !video_id) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const r = await finalizarReel(auth.admin, cuenta_id, { video_id, music_id: music_id ?? null, caption: caption ?? "" });
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true, ...r });
}
