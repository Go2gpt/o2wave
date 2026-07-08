import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { proximaPublicacion } from "@/lib/autopost/schedule";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Aprueba (→ scheduled con publish_at) o rechaza (→ rejected) una pieza. Solo admin.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { post_id, accion } = await request.json() as { post_id?: string; accion?: "aprobar" | "rechazar" };
  if (!post_id || (accion !== "aprobar" && accion !== "rechazar")) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { data: post } = await auth.admin
    .from("autopost_posts").select("id, cuenta_id, estado").eq("id", post_id).maybeSingle();
  if (!post) return NextResponse.json({ error: "Pieza no encontrada" }, { status: 404 });
  if (post.estado !== "pending_review") {
    return NextResponse.json({ error: `La pieza ya no está pendiente (estado: ${post.estado}).` }, { status: 409 });
  }

  if (accion === "rechazar") {
    await auth.admin.from("autopost_posts").update({ estado: "rejected", updated_at: new Date().toISOString() }).eq("id", post_id);
    return NextResponse.json({ ok: true, estado: "rejected" });
  }

  // Aprobar → programar según la config de la cuenta.
  const { data: cuenta } = await auth.admin
    .from("autopost_cuentas").select("dias_horas").eq("id", post.cuenta_id).maybeSingle();
  const publishAt = proximaPublicacion(cuenta?.dias_horas as { dia: number; hora: string }[] | null);

  const { error } = await auth.admin.from("autopost_posts").update({
    estado: "scheduled", publish_at: publishAt, aprobado_por: auth.adminId,
    aprobado_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", post_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, estado: "scheduled", publish_at: publishAt });
}
