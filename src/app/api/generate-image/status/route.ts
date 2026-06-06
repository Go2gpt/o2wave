import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { composeHeadline } from "@/lib/composeImage";

export const maxDuration = 60;

// aspect_ratio → dimensiones finales + nº máximo de líneas del titular.
const DIMS: Record<string, { w: number; h: number; maxLines: number }> = {
  "1:1": { w: 1080, h: 1080, maxLines: 4 },
  "9:16": { w: 1080, h: 1920, maxLines: 6 },
  "16:9": { w: 1920, h: 1080, maxLines: 4 },
};

export async function POST(request: NextRequest) {
  try {
    const { id, headline, aspectRatio } = await request.json();
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) return NextResponse.json({ error: "REPLICATE_API_TOKEN no configurado" }, { status: 500 });

    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ error: "Error consultando estado" }, { status: 500 });

    const data = await res.json();
    if (data.status !== "succeeded") {
      return NextResponse.json({ status: data.status, imagenUrl: null });
    }

    const rawUrl: string | undefined = data.output?.[0];
    if (!rawUrl) return NextResponse.json({ status: "failed", imagenUrl: null });

    // 1) Descargar la imagen base de Replicate
    const imgRes = await fetch(rawUrl);
    const baseBuffer = Buffer.from(await imgRes.arrayBuffer());

    // 2) Estampar el titular (si lo hay) con sharp
    const dims = DIMS[aspectRatio as string] || DIMS["1:1"];
    const finalBuffer = headline && String(headline).trim()
      ? await composeHeadline(baseBuffer, String(headline), dims.w, dims.h, dims.maxLines)
      : baseBuffer;

    // 3) Subir a Supabase Storage (bucket público post-images, carpeta del usuario)
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const filePath = `${user.id}/post-${Date.now()}.png`;
    const { error: upErr } = await supabase.storage
      .from("post-images")
      .upload(filePath, finalBuffer, { contentType: "image/png", upsert: false });
    if (upErr) {
      console.error("storage upload error:", upErr);
      return NextResponse.json({ error: "No se pudo guardar la imagen" }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(filePath);
    return NextResponse.json({ status: "succeeded", imagenUrl: pub.publicUrl });
  } catch (error) {
    console.error("status/compose error:", error);
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
