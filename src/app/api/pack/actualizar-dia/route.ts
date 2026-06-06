import { NextRequest, NextResponse } from "next/server";
import { accederPack, errorStatus } from "@/lib/packAuth";
import type { PackDia } from "@/types";

export const dynamic = "force-dynamic";

// Campos editables manualmente desde el editor de día.
const CAMPOS_EDITABLES: (keyof PackDia)[] = ["titular", "texto", "hashtags", "imagen_url"];

export async function POST(request: NextRequest) {
  try {
    const { pack_id, dia_index, cambios } = await request.json();
    if (!pack_id || typeof dia_index !== "number" || !cambios || typeof cambios !== "object") {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const { admin, pack } = await accederPack(pack_id);
    const dias: PackDia[] = pack.contenido?.dias || [];
    if (dia_index < 0 || dia_index >= dias.length) return NextResponse.json({ error: "Índice fuera de rango" }, { status: 400 });

    const patch: Partial<PackDia> = {};
    for (const k of CAMPOS_EDITABLES) {
      if (k in cambios) (patch as Record<string, unknown>)[k] = cambios[k];
    }
    dias[dia_index] = { ...dias[dia_index], ...patch };

    const { error } = await admin.from("packs_semanales").update({ contenido: { dias } }).eq("id", pack_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, dia: dias[dia_index] });
  } catch (e) {
    const { status, message } = errorStatus(e);
    return NextResponse.json({ error: message }, { status });
  }
}
