import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PatchCuenta {
  activo?: boolean;
  perfil_publicacion?: "producto" | "ong_general";
  auto_approve?: boolean;
  frecuencia_semanal?: number;
  dias_horas?: { dia: number; hora: string }[];
}

// Actualiza la config de una cuenta de autopost (solo admin).
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { cuenta_id, patch } = await request.json() as { cuenta_id?: string; patch?: PatchCuenta };
  if (!cuenta_id || !patch) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const { data: cuenta } = await auth.admin
    .from("autopost_cuentas").select("perfil_publicacion").eq("id", cuenta_id).maybeSingle();
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.activo === "boolean") upd.activo = patch.activo;
  if (patch.perfil_publicacion === "producto" || patch.perfil_publicacion === "ong_general") upd.perfil_publicacion = patch.perfil_publicacion;
  if (typeof patch.frecuencia_semanal === "number") upd.frecuencia_semanal = Math.min(3, Math.max(1, Math.round(patch.frecuencia_semanal)));
  if (Array.isArray(patch.dias_horas)) {
    upd.dias_horas = patch.dias_horas
      .filter((f) => f && f.dia >= 1 && f.dia <= 7 && /^\d{1,2}:\d{2}$/.test(f.hora || ""))
      .slice(0, 3);
  }
  if (typeof patch.auto_approve === "boolean") {
    // 1b endurecido: ong_general NUNCA auto_approve (coherente con el CHECK de BBDD).
    const perfilFinal = (upd.perfil_publicacion as string) || cuenta.perfil_publicacion;
    if (patch.auto_approve && perfilFinal === "ong_general") {
      return NextResponse.json({ error: "auto_approve no está permitido para perfil ong_general." }, { status: 400 });
    }
    upd.auto_approve = patch.auto_approve;
  }

  const { error } = await auth.admin.from("autopost_cuentas").update(upd).eq("id", cuenta_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
