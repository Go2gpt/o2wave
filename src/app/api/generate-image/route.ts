import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { construirImagePromptEN, generarImagenIA } from "@/lib/imageGen";
import type { ContentFormData } from "@/types";

export const maxDuration = 120;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Genera la imagen del post de forma SÍNCRONA con OpenAI gpt-image-2 (fallback
// gpt-image-1, y fallback final a Replicate FLUX). Sube la imagen LIMPIA (sin
// titular: el texto se hornea al descargar) y devuelve { imagenUrl }.
export async function POST(request: NextRequest) {
  try {
    const { formData }: { formData: ContentFormData } = await request.json();
    const { tipoOrganizacion, redSocial, formatoInstagram, tema } = formData;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const aspect = redSocial === "Instagram" && formatoInstagram === "Story 9:16" ? "9:16"
      : redSocial === "Facebook" ? "16:9" : "1:1";

    // Prompt visual en inglés, fotorrealista (no traduce el caption).
    const prompt = await construirImagePromptEN(tema, tipoOrganizacion);
    const buffer = await generarImagenIA(prompt, aspect);
    if (!buffer) return NextResponse.json({ error: "No se pudo generar la imagen" }, { status: 502 });

    const filePath = `${user.id}/post-${Date.now()}.png`;
    const { error: upErr } = await supabase.storage
      .from("post-images")
      .upload(filePath, buffer, { contentType: "image/png", upsert: false });
    if (upErr) {
      console.error("generate-image storage upload:", upErr.message);
      return NextResponse.json({ error: "No se pudo guardar la imagen" }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(filePath);
    return NextResponse.json({ imagenUrl: pub.publicUrl });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
