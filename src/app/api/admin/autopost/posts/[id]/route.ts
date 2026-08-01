import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IG_CHARS = 2200;

// Edita el copy de una pieza pendiente de revisión. Solo admin.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { texto } = await request.json() as { texto?: string };
  if (typeof texto !== "string" || !texto.trim()) return NextResponse.json({ error: "Texto vacío" }, { status: 400 });

  const { data: post } = await auth.admin.from("autopost_posts").select("estado").eq("id", params.id).maybeSingle();
  if (!post) return NextResponse.json({ error: "Pieza no encontrada" }, { status: 404 });
  if (post.estado !== "pending_review") {
    return NextResponse.json({ error: `Solo se puede editar una pieza pendiente (estado: ${post.estado}).` }, { status: 409 });
  }

  const nuevo = texto.slice(0, MAX_IG_CHARS);
  const { error } = await auth.admin.from("autopost_posts")
    .update({ texto: nuevo, updated_at: new Date().toISOString() }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, texto: nuevo });
}
