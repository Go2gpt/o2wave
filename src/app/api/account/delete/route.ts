import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Borrado de cuenta (RGPD): elimina datos del usuario y su cuenta de auth.
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const uid = user.id;

  try {
    // Borrado explícito de datos asociados (por si no hay ON DELETE CASCADE en todas
    // las FKs). Tolerante: si una tabla no existe o ya está vacía, seguimos.
    const tablas = ["generated_posts", "packs_semanales", "pack_jobs", "categorias_usuario", "brand_identity", "key_dates"];
    for (const t of tablas) {
      await admin.from(t).delete().eq("user_id", uid).then(() => {}, () => { /* noop */ });
    }
    await admin.from("profiles").delete().eq("id", uid).then(() => {}, () => { /* noop */ });

    // Borrado de la cuenta de auth (service role).
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) {
      console.error("account/delete: deleteUser falló", uid, delErr.message);
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("account/delete error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
