import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { generarReelPrueba } from "@/lib/autopost/reel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // el vídeo tarda: generación + polling de Replicate

// Prototipo: genera UN Reel de prueba (keyframe + animación) y devuelve las URLs.
// NO publica — es para validar calidad antes de automatizar. Solo admin.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { cuenta_id } = await request.json().catch(() => ({})) as { cuenta_id?: string };
  if (!cuenta_id) return NextResponse.json({ error: "Falta cuenta_id" }, { status: 400 });

  const r = await generarReelPrueba(auth.admin, cuenta_id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true, ...r });
}
