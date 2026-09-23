import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { publicacionDirectaHabilitada } from "@/lib/flags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Lista las cuentas sociales conectadas del usuario en sesión (para el selector
// de publicación). Sin token. RLS ya limita a las propias, pero filtramos igual.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Publicación directa aún no abierta a todos (pendiente App Review de Meta):
  // solo admins. Los demás no ven la función (no un botón que fallaría).
  const habilitado = await publicacionDirectaHabilitada(supabase, user.id);
  if (!habilitado) return NextResponse.json({ habilitado: false, cuentas: [] });

  const { data } = await supabase
    .from("user_social_accounts")
    .select("id, etiqueta, ig_username, es_predeterminada")
    .eq("user_id", user.id).eq("activo", true)
    .order("es_predeterminada", { ascending: false }).order("created_at", { ascending: true });

  return NextResponse.json({ habilitado: true, cuentas: data || [] });
}
