import { NextRequest, NextResponse } from "next/server";
import { accederPack, errorStatus } from "@/lib/packAuth";
import { regenerarDia } from "@/lib/packProcessor";
import type { PackDia } from "@/types";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { pack_id, dia_index, nuevo_tema, modo } = await request.json();
    if (!pack_id || typeof dia_index !== "number") return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

    const { admin, userId, pack } = await accederPack(pack_id);
    const dias: PackDia[] = pack.contenido?.dias || [];
    if (dia_index < 0 || dia_index >= dias.length) return NextResponse.json({ error: "Índice fuera de rango" }, { status: 400 });

    const actualizado = await regenerarDia(admin, userId, dias[dia_index], {
      nuevoTema: typeof nuevo_tema === "string" ? nuevo_tema : undefined,
      modo: modo === "texto" || modo === "imagen" ? modo : "completo",
    });
    dias[dia_index] = actualizado;

    const { error } = await admin.from("packs_semanales").update({ contenido: { dias } }).eq("id", pack_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, dia: actualizado, sin_imagen: actualizado.tipo !== "tiktok" && !actualizado.imagen_url });
  } catch (e) {
    const { status, message } = errorStatus(e);
    return NextResponse.json({ error: message }, { status });
  }
}
