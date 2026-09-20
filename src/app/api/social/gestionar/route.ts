import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Gestiona las cuentas sociales del usuario en sesión: marcar predeterminada o
// desconectar. Escribe con service role, pero SIEMPRE verificando que la cuenta
// pertenece al usuario en sesión.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { accion, id } = await request.json() as { accion?: string; id?: string };
  if (!id || (accion !== "default" && accion !== "desconectar")) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: cuenta } = await admin
    .from("user_social_accounts").select("id, user_id").eq("id", id).maybeSingle();
  if (!cuenta || (cuenta as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }

  if (accion === "desconectar") {
    const { error } = await admin.from("user_social_accounts").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "No se pudo desconectar" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // accion === "default": quitar la marca a todas las del usuario y ponerla en esta.
  const { error: e1 } = await admin.from("user_social_accounts")
    .update({ es_predeterminada: false }).eq("user_id", user.id);
  if (e1) return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
  const { error: e2 } = await admin.from("user_social_accounts")
    .update({ es_predeterminada: true }).eq("id", id);
  if (e2) return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
