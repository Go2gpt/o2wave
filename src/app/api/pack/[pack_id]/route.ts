import { NextResponse } from "next/server";
import { accederPack, errorStatus } from "@/lib/packAuth";
import type { PackDia } from "@/types";

export const maxDuration = 30;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, { params }: { params: { pack_id: string } }) {
  try {
    const { admin, pack } = await accederPack(params.pack_id);

    // Borrar los jobs asociados primero (FK ON DELETE SET NULL no los elimina).
    await admin.from("pack_jobs").delete().eq("pack_id", params.pack_id);

    // Best-effort: limpiar las imágenes del bucket post-images (no bloquea si falla).
    try {
      const marker = "/post-images/";
      const paths: string[] = [];
      for (const d of (pack.contenido?.dias || []) as PackDia[]) {
        for (const u of [d.imagen_url, d.imagen_limpia_url]) {
          if (typeof u === "string" && u.includes(marker)) {
            paths.push(decodeURIComponent(u.split(marker)[1].split("?")[0]));
          }
        }
      }
      if (paths.length) await admin.storage.from("post-images").remove(paths);
    } catch (e) {
      console.error("borrar pack: limpieza de storage:", e instanceof Error ? e.message : e);
    }

    const { error } = await admin.from("packs_semanales").delete().eq("id", params.pack_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const { status, message } = errorStatus(e);
    return NextResponse.json({ error: message }, { status });
  }
}
