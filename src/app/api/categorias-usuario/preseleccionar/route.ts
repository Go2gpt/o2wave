import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { preseleccionarCategorias } from "@/lib/preseleccionarCategorias";

export const maxDuration = 30;

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const categorias = await preseleccionarCategorias(supabase, user.id);
    return NextResponse.json({ categorias });
  } catch (error) {
    console.error("preseleccionar route error:", error);
    return NextResponse.json({ error: "Error en la preselección" }, { status: 500 });
  }
}
