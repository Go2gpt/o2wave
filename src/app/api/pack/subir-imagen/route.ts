import { NextRequest, NextResponse } from "next/server";
import { accederPack, errorStatus } from "@/lib/packAuth";
import { componerYSubir, subirImagenLimpia, aspectDeTipo } from "@/lib/packProcessor";
import type { PackDia } from "@/types";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS_OK = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const packId = form.get("pack_id");
    const diaIndexRaw = form.get("dia_index");
    const file = form.get("file");

    if (typeof packId !== "string" || typeof diaIndexRaw !== "string" || !(file instanceof File)) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }
    const diaIndex = Number(diaIndexRaw);
    if (!Number.isInteger(diaIndex)) return NextResponse.json({ error: "Índice inválido" }, { status: 400 });
    if (!TIPOS_OK.includes(file.type)) return NextResponse.json({ error: "Formato no válido (usa PNG, JPG o WEBP)." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "La imagen supera los 10 MB." }, { status: 400 });

    const { admin, userId, pack } = await accederPack(packId);
    const dias: PackDia[] = pack.contenido?.dias || [];
    if (diaIndex < 0 || diaIndex >= dias.length) return NextResponse.json({ error: "Índice fuera de rango" }, { status: 400 });

    const dia = dias[diaIndex];
    const buffer = Buffer.from(await file.arrayBuffer());

    // La imagen subida es la nueva "limpia".
    const urlLimpia = await subirImagenLimpia(admin, userId, buffer, file.type);
    if (!urlLimpia) return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });

    // Componer el titular actual sobre ella.
    const nuevaUrl = await componerYSubir(admin, userId, buffer, dia.titular || dia.tema, aspectDeTipo(dia.tipo));
    if (!nuevaUrl) return NextResponse.json({ error: "No se pudo componer la imagen." }, { status: 500 });

    dias[diaIndex] = { ...dia, imagen_url: nuevaUrl, imagen_limpia_url: urlLimpia };
    const { error } = await admin.from("packs_semanales").update({ contenido: { dias } }).eq("id", packId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, dia: dias[diaIndex] });
  } catch (e) {
    const { status, message } = errorStatus(e);
    return NextResponse.json({ error: message }, { status });
  }
}
