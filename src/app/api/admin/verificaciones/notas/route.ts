import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Guarda las notas internas del admin sin cambiar el estado de verificación.
export async function POST(request: NextRequest) {
  try {
    const { user_id, notas } = await request.json();
    if (!user_id) return NextResponse.json({ error: "Falta user_id" }, { status: 400 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: caller } = await supabase
      .from("profiles").select("es_admin").eq("id", user.id).single();
    if (!caller?.es_admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const admin = createAdminClient();
    const { error: updErr } = await admin
      .from("profiles")
      .update({ verification_notes: typeof notas === "string" ? notas : null })
      .eq("id", user_id);
    if (updErr) {
      console.error("notas update error:", updErr);
      return NextResponse.json({ error: "No se pudieron guardar las notas" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
