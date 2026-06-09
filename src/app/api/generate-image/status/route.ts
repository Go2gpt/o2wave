import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
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

    const out = data.output;
    const rawUrl: string | undefined = Array.isArray(out) ? out[0] : (typeof out === "string" ? out : undefined);
    if (!rawUrl) return NextResponse.json({ status: "failed", imagenUrl: null });

    // Descargar la imagen LIMPIA (sin texto) y subirla tal cual a Storage.
    // El texto se hornea después, al descargar, según lo que edite el usuario.
    const imgRes = await fetch(rawUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const filePath = `${user.id}/post-${Date.now()}.webp`;
    const { error: upErr } = await supabase.storage
      .from("post-images")
      .upload(filePath, buffer, { contentType: "image/webp", upsert: false });
    if (upErr) {
      console.error("storage upload error:", upErr);
      return NextResponse.json({ error: "No se pudo guardar la imagen" }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(filePath);
    return NextResponse.json({ status: "succeeded", imagenUrl: pub.publicUrl });
  } catch (error) {
    console.error("status error:", error);
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
