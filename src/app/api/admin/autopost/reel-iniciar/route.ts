import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { iniciarReel } from "@/lib/autopost/reel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// FASE 1 del Reel: arranca la generación (fotograma + vídeo + música) y devuelve
// los IDs para que el cliente haga polling con /reel-estado. Responde rápido. Solo admin.
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { cuenta_id } = await request.json().catch(() => ({})) as { cuenta_id?: string };
  if (!cuenta_id) return NextResponse.json({ error: "Falta cuenta_id" }, { status: 400 });

  const r = await iniciarReel(auth.admin, cuenta_id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ ok: true, ...r });
}
