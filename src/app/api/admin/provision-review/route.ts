import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// TEMPORAL — provisiona la cuenta de prueba para el revisor de Meta (App Review).
// Solo ejecutable por un usuario es_admin en sesión. Crea/actualiza la cuenta
// meta-review@o2wave.app con plan activo y onboarding hecho (sin rol admin), que
// el allowlist de flags.ts habilita para la publicación directa. Borrar tras usar.
const EMAIL = "meta-review@o2wave.app";
const PASSWORD = "MetaReview-o2w-2026";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("es_admin").eq("id", user.id).maybeSingle();
  if (!(me as { es_admin?: boolean } | null)?.es_admin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const admin = createAdminClient();
  let userId: string | null = null;
  let creado = false;

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: EMAIL, password: PASSWORD, email_confirm: true,
  });
  if (created?.user) { userId = created.user.id; creado = true; }
  else {
    // Ya existe → buscarlo y resetear contraseña + confirmar.
    for (let page = 1; page <= 20 && !userId; page++) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const found = (list?.users || []).find((u) => (u.email || "").toLowerCase() === EMAIL);
      if (found) userId = found.id;
      if (!list || list.users.length < 200) break;
    }
    if (!userId) return NextResponse.json({ error: "createUser falló: " + (cErr?.message || "desconocido") }, { status: 500 });
    await admin.auth.admin.updateUserById(userId, { password: PASSWORD, email_confirm: true });
  }

  const profile = {
    id: userId, email: EMAIL, nombre_entidad: "Meta App Review",
    tipo_entidad: "empresa", plan: "pro", plan_actual: "pro", plan_estado: "activa",
    onboarding_complete: true, cuenta_suspendida: false,
  };
  const { error: pErr } = await admin.from("profiles").upsert(profile, { onConflict: "id" });
  if (pErr) {
    // Fallback: update parcial (por si upsert choca con columnas NOT NULL sin default).
    await admin.from("profiles").update({
      email: EMAIL, tipo_entidad: "empresa", plan_estado: "activa",
      onboarding_complete: true, cuenta_suspendida: false,
    }).eq("id", userId);
  }

  const { data: chk } = await admin.from("profiles")
    .select("id,email,tipo_entidad,plan,plan_estado,onboarding_complete,es_admin,cuenta_suspendida")
    .eq("id", userId).maybeSingle();

  return NextResponse.json({
    ok: true, creado, email: EMAIL, password: PASSWORD,
    perfil: chk, nota: "Cuenta lista. Borra este endpoint tras verificar.",
  });
}
