import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { regenerarImagenAutopost } from "@/lib/autopost/generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// Regenera la imagen de una pieza pendiente (escena derivada del copy). Solo admin.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: post } = await auth.admin
    .from("autopost_posts").select("id, cuenta_id, estado, texto").eq("id", params.id).maybeSingle();
  if (!post) return NextResponse.json({ error: "Pieza no encontrada" }, { status: 404 });
  if (post.estado !== "pending_review") {
    return NextResponse.json({ error: `Solo se puede regenerar una pieza pendiente (estado: ${post.estado}).` }, { status: 409 });
  }

  const r = await regenerarImagenAutopost(auth.admin, post.cuenta_id, post.texto);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 502 });

  const { error } = await auth.admin.from("autopost_posts")
    .update({ imagen_url: r.url, updated_at: new Date().toISOString() }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, imagen_url: r.url });
}
