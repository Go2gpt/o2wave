import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/adminAudit";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TABLAS_USUARIO = ["generated_posts", "packs_semanales", "pack_jobs", "categorias_usuario", "brand_identity", "key_dates", "logs_consentimiento"];

// Eliminación RGPD de una cuenta por el admin: cancela la suscripción de Stripe,
// borra documentos en Storage, datos y la cuenta de auth. Registra la acción.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { user_id, motivo } = await request.json() as { user_id: string; motivo?: string };
  if (!user_id) return NextResponse.json({ error: "Falta user_id" }, { status: 400 });
  if (user_id === auth.adminId) return NextResponse.json({ error: "No puedes eliminar tu propia cuenta." }, { status: 400 });

  const admin = auth.admin;

  try {
    // 1) Cancelar suscripción de Stripe (si la hay). Tolerante.
    const { data: prof } = await admin
      .from("profiles").select("stripe_subscription_id").eq("id", user_id).single();
    if (prof?.stripe_subscription_id) {
      try { await getStripe().subscriptions.cancel(prof.stripe_subscription_id); }
      catch (e) { console.error("eliminar: cancelar sub falló:", e instanceof Error ? e.message : e); }
    }

    // 2) Borrar documentos del usuario en Storage (ambos buckets).
    for (const bucket of ["verification-docs", "post-images"]) {
      try {
        const { data: files } = await admin.storage.from(bucket).list(user_id, { limit: 1000 });
        const paths = (files ?? []).filter((f) => f.name && f.name !== ".emptyFolderPlaceholder").map((f) => `${user_id}/${f.name}`);
        if (paths.length) await admin.storage.from(bucket).remove(paths);
      } catch (e) { console.error(`eliminar: storage ${bucket} falló:`, e instanceof Error ? e.message : e); }
    }

    // 3) Borrar datos asociados + perfil (tolerante por tabla).
    for (const t of TABLAS_USUARIO) {
      await admin.from(t).delete().eq("user_id", user_id).then(() => {}, () => {});
    }
    await admin.from("profiles").delete().eq("id", user_id).then(() => {}, () => {});

    // 4) Borrar la cuenta de auth.
    const { error: delErr } = await admin.auth.admin.deleteUser(user_id);
    if (delErr) {
      console.error("eliminar: deleteUser falló", user_id, delErr.message);
      return NextResponse.json({ error: "No se pudo eliminar la cuenta de auth" }, { status: 500 });
    }

    // 5) Auditoría (el log sobrevive: target_user_id no tiene FK).
    await logAdminAction(admin, auth.adminId, "eliminar", user_id, motivo);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("eliminar error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo eliminar la cuenta" }, { status: 500 });
  }
}
