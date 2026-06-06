import { NextRequest, NextResponse } from "next/server";
import { accederPack, errorStatus } from "@/lib/packAuth";
import type { PackDia } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { pack_id, dia_index } = await request.json();
    if (!pack_id || typeof dia_index !== "number") return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

    const { admin, pack } = await accederPack(pack_id);
    const dias: PackDia[] = pack.contenido?.dias || [];
    if (dia_index < 0 || dia_index >= dias.length) return NextResponse.json({ error: "Índice fuera de rango" }, { status: 400 });

    dias.splice(dia_index, 1);
    const { error } = await admin.from("packs_semanales").update({ contenido: { dias } }).eq("id", pack_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, dias: dias.length });
  } catch (e) {
    const { status, message } = errorStatus(e);
    return NextResponse.json({ error: message }, { status });
  }
}
