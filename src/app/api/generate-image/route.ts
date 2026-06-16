import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { construirImagePromptEN, generarImagenIA, generarImagenIAConFoto } from "@/lib/imageGen";
import { canUseFeature, isPlanActivo } from "@/lib/plans";
import type { ContentFormData } from "@/types";

export const maxDuration = 300; // Vercel Pro: margen para HEIC + images.edit
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FOTO_BYTES = 8 * 1024 * 1024; // 8 MB
const MIME_PERMITIDOS = ["image/jpeg", "image/png"];

// Marcas (brands) HEIF/HEIC más comunes en la caja "ftyp" del contenedor.
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1", "heif"];

/** ¿El buffer es HEIC/HEIF? Detecta por MIME o por los bytes mágicos (ftyp + brand). */
function esHeic(buffer: Buffer, mime: string): boolean {
  if (mime === "image/heic" || mime === "image/heif") return true;
  if (buffer.length < 12) return false;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  return HEIC_BRANDS.includes(buffer.toString("ascii", 8, 12).toLowerCase());
}

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
// Pro: si el request llega como multipart con una foto adjunta (campo "foto"),
// se integra esa persona en la escena con OpenAI images.edit. La foto viaja en
// el propio request (no se sube a Storage desde el cliente). Requiere "image_edit".
export async function POST(request: NextRequest) {
  try {
    // DIAGNÓSTICO (temporal): ¿llega OPENAI_API_KEY al runtime de la función?
    // Si length es "undefined" o la key no aparece, el problema es de Vercel
    // (env no inyectada / nombre distinto / Sensitive), no del código.
    console.log("[generate-image] OPENAI_API_KEY length:", process.env.OPENAI_API_KEY?.length ?? "undefined");
    console.log("[generate-image] keys with OPENAI in name:", Object.keys(process.env).filter(k => k.includes("OPENAI")));

    // Aceptamos JSON (sin foto) o multipart/form-data (con foto). La foto se
    // envía como File en el propio request — NO se sube a Storage desde el
    // cliente (Safari iOS construía URLs que WebKit rechazaba).
    const ct = request.headers.get("content-type") || "";
    let formData: ContentFormData;
    let fotoBufferRaw: Buffer | null = null;
    let fotoMime = "";
    if (ct.includes("multipart/form-data")) {
      const fd = await request.formData();
      const payload = fd.get("payload");
      formData = JSON.parse(typeof payload === "string" ? payload : "{}") as ContentFormData;
      const foto = fd.get("foto");
      if (foto instanceof File) {
        fotoBufferRaw = Buffer.from(await foto.arrayBuffer());
        fotoMime = foto.type || "";
      }
    } else {
      const body = await request.json();
      formData = body.formData as ContentFormData;
    }
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

    if (fotoBufferRaw) {
      // --- Camino Pro: integrar la foto del usuario (images.edit) ---
      const { data: profile } = await supabase
        .from("profiles").select("plan_actual, plan_estado, es_admin").eq("id", user.id).single();
      if (!isPlanActivo(profile)) {
        return NextResponse.json({ error: "plan_suspendido", mensaje: "Tu suscripción tiene un pago pendiente." }, { status: 402 });
      }
      if (!canUseFeature(profile, "image_edit")) {
        return NextResponse.json({ error: "feature_no_disponible", mensaje: "Integrar tu foto está disponible en el plan Pro." }, { status: 403 });
      }
      let fotoBuffer = fotoBufferRaw;
      let mime = fotoMime;
      if (fotoBuffer.byteLength > MAX_FOTO_BYTES) {
        return NextResponse.json({ error: "La foto supera el límite de 8 MB." }, { status: 413 });
      }
      // iPhone sube HEIC por defecto. Lo convertimos a JPEG de forma invisible
      // (sharp en Vercel no decodifica HEIC; heic-convert es JS puro).
      if (esHeic(fotoBuffer, mime)) {
        try {
          const heicConvert = (await import("heic-convert")).default;
          const jpeg = await heicConvert({ buffer: fotoBuffer, format: "JPEG", quality: 0.92 });
          fotoBuffer = Buffer.from(jpeg);
          mime = "image/jpeg";
          console.log("generate-image: HEIC convertido a JPEG");
        } catch (e) {
          console.error("generate-image: fallo conversión HEIC:", e instanceof Error ? e.message : e);
          return NextResponse.json({ error: "No pudimos convertir tu foto HEIC. Haz una captura de pantalla o usa una foto JPEG/PNG." }, { status: 400 });
        }
      }
      if (!MIME_PERMITIDOS.includes(mime)) {
        return NextResponse.json({ error: "Formato de foto no válido (usa JPEG, PNG o HEIC)." }, { status: 400 });
      }

      const edit = await generarImagenIAConFoto(prompt, { buffer: fotoBuffer, mime }, aspect);
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
