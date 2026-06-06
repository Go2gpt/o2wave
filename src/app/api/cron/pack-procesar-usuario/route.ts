import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { procesarPackJob } from "@/lib/packProcessor";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Procesa un pack_job completo (un usuario). Lo invoca el dispatcher en
// fire-and-forget. Protegido por CRON_TOKEN.
export async function POST(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const token = request.nextUrl.searchParams.get("token");

  if (!process.env.CRON_TOKEN || token !== process.env.CRON_TOKEN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const admin = createAdminClient();
  try {
    const resultado = await procesarPackJob(admin, id);
    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    console.error("pack-procesar-usuario error:", msg);
    // Marcar el job como fallido (sin romper si esto también falla).
    try {
      await admin.from("pack_jobs").update({ estado: "failed", error_msg: msg.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", id);
    } catch { /* noop */ }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
