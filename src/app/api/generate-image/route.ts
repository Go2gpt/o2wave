import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { construirImagePromptEN, generarImagenIA } from "@/lib/imageGen";
import type { ContentFormData } from "@/types";

export const maxDuration = 300;
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

    const aspect = redSocial === "Instagram" ? (formatoInstagram === "Story 9:16" ? "9:16" : "4:5")
      : redSocial === "Facebook" ? "16:9" : "1:1";

    // Prompt visual en inglés, fotorrealista (no traduce el caption).
    const prompt = await construirImagePromptEN(tema, tipoOrganizacion);
    const gen = await generarImagenIA(prompt, aspect);
    if (!gen) return NextResponse.json({ error: "No se pudo generar la imagen" }, { status: 502 });
    // Observabilidad: qué modelo sirvió realmente (gpt-image-2 / gpt-image-1 / flux).
    console.log(`generate-image: modelo activo = ${gen.fuente} (aspect ${aspect})`);

    const filePath = `${user.id}/post-${Date.now()}.png`;
    const { error: upErr } = await supabase.storage
      .from("post-images")
      .upload(filePath, gen.buffer, { contentType: "image/png", upsert: false });
    if (upErr) {
      console.error("generate-image storage upload:", upErr.message);
      return NextResponse.json({ error: "No se pudo guardar la imagen" }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(filePath);
    return NextResponse.json({ imagenUrl: pub.publicUrl, modelo: gen.fuente });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
