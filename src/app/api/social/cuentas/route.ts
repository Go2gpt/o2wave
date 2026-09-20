import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Lista las cuentas sociales conectadas del usuario en sesión (para el selector
// de publicación). Sin token. RLS ya limita a las propias, pero filtramos igual.
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data } = await supabase
    .from("user_social_accounts")
    .select("id, etiqueta, ig_username, es_predeterminada")
    .eq("user_id", user.id).eq("activo", true)
    .order("es_predeterminada", { ascending: false }).order("created_at", { ascending: true });

  return NextResponse.json({ cuentas: data || [] });
}
