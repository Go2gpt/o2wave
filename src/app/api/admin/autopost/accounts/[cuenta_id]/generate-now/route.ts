import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { generarPiezaManual } from "@/lib/autopost/generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// "Generar pack ahora": crea UNA pieza para la cuenta, bypassando el guard
// semanal del cron C4. Siempre pending_review. Solo admin, solo perfil producto.
export async function POST(_request: Request, { params }: { params: { cuenta_id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: cuenta } = await auth.admin
    .from("autopost_cuentas").select("id, perfil_publicacion, activo").eq("id", params.cuenta_id).maybeSingle();
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  if (cuenta.perfil_publicacion !== "producto") {
    return NextResponse.json({ error: "Generación manual solo disponible para perfil producto (Fase 1a)." }, { status: 400 });
  }

  const r = await generarPiezaManual(auth.admin, cuenta.id, cuenta.perfil_publicacion);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json(r);
}
