import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { construirImagePromptEN, generarImagenIA, generarImagenIAConFoto } from "@/lib/imageGen";
import { canUseFeature, isPlanActivo } from "@/lib/plans";
import type { ContentFormData } from "@/types";

export const maxDuration = 120;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FOTO_BYTES = 8 * 1024 * 1024; // 8 MB
const MIME_PERMITIDOS = ["image/jpeg", "image/png"];

// Mensajes al usuario según el motivo de rechazo de OpenAI images.edit.
const MENSAJE_EDIT: Record<string, string> = {
  content_policy: "OpenAI ha rechazado esta foto por su política de contenido. Prueba con una imagen diferente (evita rostros muy cercanos o personas reconocibles).",
  invalid_image: "El formato de la imagen no es compatible. Convierte a JPEG o PNG y vuelve a intentarlo.",
  generic: "No se pudo integrar tu foto. Prueba con otra imagen o sin foto.",
};

// Genera la imagen del post de forma SÍNCRONA con OpenAI gpt-image-2 (fallback
// gpt-image-1, y fallback final a Replicate FLUX). Sube la imagen LIMPIA (sin
// titular: el texto se hornea al descargar) y devuelve { imagenUrl }.
//
// Pro: si llega `fotoPath` (una foto del usuario ya subida a post-images), se
// integra esa persona en la escena con OpenAI images.edit. Tras procesarla, la
// foto temporal se borra. Requiere plan con feature "image_edit".
export async function POST(request: NextRequest) {
  try {
    const { formData, fotoPath }: { formData: ContentFormData; fotoPath?: string } = await request.json();
    const { tipoOrganizacion, redSocial, formatoInstagram, tema } = formData;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const aspect = redSocial === "Instagram" ? (formatoInstagram === "Story 9:16" ? "9:16" : "4:5")
      : redSocial === "Facebook" ? "16:9" : "1:1";

    // Prompt visual en inglés, fotorrealista (no traduce el caption).
    const prompt = await construirImagePromptEN(tema, tipoOrganizacion);

    let gen: { buffer: Buffer; fuente: string } | null = null;
    let fotoIntegrada = false;

    if (fotoPath) {
      // --- Camino Pro: integrar la foto del usuario (images.edit) ---
      const { data: profile } = await supabase
        .from("profiles").select("plan_actual, plan_estado, es_admin").eq("id", user.id).single();
      if (!isPlanActivo(profile)) {
        return NextResponse.json({ error: "plan_suspendido", mensaje: "Tu suscripción tiene un pago pendiente." }, { status: 402 });
      }
      if (!canUseFeature(profile, "image_edit")) {
        return NextResponse.json({ error: "feature_no_disponible", mensaje: "Integrar tu foto está disponible en el plan Pro." }, { status: 403 });
      }
      // Solo aceptamos rutas dentro de la carpeta del propio usuario.
      if (!fotoPath.startsWith(`${user.id}/`)) {
        return NextResponse.json({ error: "Ruta de foto no válida" }, { status: 400 });
      }
      const { data: fotoBlob, error: dlErr } = await supabase.storage.from("post-images").download(fotoPath);
      if (dlErr || !fotoBlob) {
        return NextResponse.json({ error: "No se pudo leer la foto subida" }, { status: 400 });
      }
      const mime = fotoBlob.type || "image/png";
      if (!MIME_PERMITIDOS.includes(mime)) {
        await supabase.storage.from("post-images").remove([fotoPath]);
        return NextResponse.json({ error: "Formato de foto no válido (usa JPEG o PNG)." }, { status: 400 });
      }
      const fotoBuffer = Buffer.from(await fotoBlob.arrayBuffer());
      if (fotoBuffer.byteLength > MAX_FOTO_BYTES) {
        await supabase.storage.from("post-images").remove([fotoPath]);
        return NextResponse.json({ error: "La foto supera el límite de 8 MB." }, { status: 413 });
      }

      const edit = await generarImagenIAConFoto(prompt, { buffer: fotoBuffer, mime }, aspect);
      // La foto temporal ya no hace falta (haya ido bien o mal).
      await supabase.storage.from("post-images").remove([fotoPath]);
      if ("error" in edit) {
        return NextResponse.json({ error: "edit_fallida", code: edit.error, mensaje: MENSAJE_EDIT[edit.error] }, { status: 502 });
      }
      gen = edit;
      fotoIntegrada = true;
    } else {
      // --- Camino normal: generación desde cero ---
      gen = await generarImagenIA(prompt, aspect);
      if (!gen) return NextResponse.json({ error: "No se pudo generar la imagen" }, { status: 502 });
    }

    // Observabilidad: qué modelo sirvió realmente (gpt-image-2 / gpt-image-1 / flux / edit).
    console.log(`generate-image: modelo activo = ${gen.fuente} (aspect ${aspect}${fotoIntegrada ? ", con foto" : ""})`);

    const filePath = `${user.id}/post-${Date.now()}.png`;
    const { error: upErr } = await supabase.storage
      .from("post-images")
      .upload(filePath, gen.buffer, { contentType: "image/png", upsert: false });
    if (upErr) {
      console.error("generate-image storage upload:", upErr.message);
      return NextResponse.json({ error: "No se pudo guardar la imagen" }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(filePath);
    return NextResponse.json({ imagenUrl: pub.publicUrl, modelo: gen.fuente, fotoIntegrada });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
