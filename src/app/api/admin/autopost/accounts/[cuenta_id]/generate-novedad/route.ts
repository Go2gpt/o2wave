import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { generarPiezaNovedadManual } from "@/lib/autopost/generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// piezaNovedad AD-HOC: genera 1 pieza de anuncio de feature real (versión +
// feature de la whitelist). No entra en la rotación automática. Solo admin.
export async function POST(request: Request, { params }: { params: { cuenta_id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // La feature se elige de la whitelist filtrada en el generador. El panel puede
  // sugerir un featureId; si no cumple las 3 condiciones se usa la primera candidata.
  const { featureId } = await request.json().catch(() => ({})) as { featureId?: string };

  const { data: cuenta } = await auth.admin
    .from("autopost_cuentas").select("id, perfil_publicacion").eq("id", params.cuenta_id).maybeSingle();
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  if (cuenta.perfil_publicacion !== "producto") {
    return NextResponse.json({ error: "Novedad solo disponible para perfil producto (Fase 1a)." }, { status: 400 });
  }

  const r = await generarPiezaNovedadManual(auth.admin, cuenta.id, cuenta.perfil_publicacion, { featureId });
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json(r);
}
