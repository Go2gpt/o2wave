import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { publicarPostAutopost } from "@/lib/autopost/publishPost";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// "Publicar ahora": adelanta la pieza a now(), la marca scheduled y publica
// inline (opción B). Vale para pending_review o scheduled. Solo admin.
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const postId = params.id;
  const { data: post } = await auth.admin
    .from("autopost_posts").select("id, estado").eq("id", postId).maybeSingle();
  if (!post) return NextResponse.json({ error: "Pieza no encontrada" }, { status: 404 });
  if (!["pending_review", "scheduled"].includes(post.estado)) {
    return NextResponse.json({ error: `La pieza no se puede publicar (estado: ${post.estado}).` }, { status: 409 });
  }

  const ahora = new Date().toISOString();
  await auth.admin.from("autopost_posts").update({
    estado: "scheduled", publish_at: ahora,
    aprobado_por: auth.adminId, aprobado_at: ahora, updated_at: ahora,
  }).eq("id", postId);

  const res = await publicarPostAutopost(auth.admin, postId);
  return NextResponse.json(res);
}
