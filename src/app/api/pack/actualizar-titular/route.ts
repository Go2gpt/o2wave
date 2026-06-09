import { NextRequest, NextResponse } from "next/server";
import { accederPack, errorStatus } from "@/lib/packAuth";
import { componerYSubir, aspectDeTipo } from "@/lib/packProcessor";
import type { PackDia } from "@/types";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { pack_id, dia_index, titular } = await request.json();
    if (!pack_id || typeof dia_index !== "number" || typeof titular !== "string" || !titular.trim()) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const { admin, userId, pack } = await accederPack(pack_id);
    const dias: PackDia[] = pack.contenido?.dias || [];
    if (dia_index < 0 || dia_index >= dias.length) return NextResponse.json({ error: "Índice fuera de rango" }, { status: 400 });

    const dia = dias[dia_index];
    if (!dia.imagen_limpia_url) {
      return NextResponse.json({ error: "Este día no tiene imagen limpia guardada. Regenera la imagen para poder editar solo el titular." }, { status: 400 });
    }

    // Descargar la imagen limpia y recomponer con el nuevo titular.
    const res = await fetch(dia.imagen_limpia_url);
    if (!res.ok) return NextResponse.json({ error: "No se pudo descargar la imagen limpia." }, { status: 502 });
    const clean = Buffer.from(await res.arrayBuffer());

    const nuevaUrl = await componerYSubir(admin, userId, clean, titular.trim(), aspectDeTipo(dia.tipo));
    if (!nuevaUrl) return NextResponse.json({ error: "No se pudo componer la imagen." }, { status: 500 });

    dias[dia_index] = { ...dia, titular: titular.trim(), imagen_url: nuevaUrl };
    const { error } = await admin.from("packs_semanales").update({ contenido: { dias } }).eq("id", pack_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, dia: dias[dia_index] });
  } catch (e) {
    const { status, message } = errorStatus(e);
    return NextResponse.json({ error: message }, { status });
  }
}
