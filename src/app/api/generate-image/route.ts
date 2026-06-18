import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { construirImagePromptEN, generarImagenIA, generarImagenIntegrada } from "@/lib/imageGen";
import type { ContentFormData } from "@/types";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FOTO_BYTES = 8 * 1024 * 1024; // 8 MB
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1", "heif"];

function esHeic(buffer: Buffer, mime: string): boolean {
  if (mime === "image/heic" || mime === "image/heif") return true;
  if (buffer.length < 12) return false;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  return HEIC_BRANDS.includes(buffer.toString("ascii", 8, 12).toLowerCase());
}

function aspectDe(formData: ContentFormData): string {
  return formData.redSocial === "Instagram" ? (formData.formatoInstagram === "Story 9:16" ? "9:16" : "4:5")
    : formData.redSocial === "Facebook" ? "16:9" : "1:1";
}

// Genera la imagen del post (modo 'ia' = Gemini/FLUX desde prompt) o, si llega
// multipart con foto + modo 'integrada', integra la cara del usuario en la escena
// con Gemini (image+text→image). Sube la imagen LIMPIA y devuelve { imagenUrl }.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const ct = request.headers.get("content-type") || "";

    // ---------- Modo INTEGRADA: foto + IA (multipart) ----------
    if (ct.includes("multipart/form-data")) {
      const fd = await request.formData();
      const payload = fd.get("payload");
      const formData = JSON.parse(typeof payload === "string" ? payload : "{}") as ContentFormData;
      const foto = fd.get("foto");
      if (!(foto instanceof File)) return NextResponse.json({ error: "Falta la foto" }, { status: 400 });

      // Gating: solo planes de pago (no ong_pequena) o admin.
      const { data: profile } = await supabase
        .from("profiles").select("plan_actual, es_admin").eq("id", user.id).single();
      const esPago = !!profile?.es_admin || (!!profile?.plan_actual && profile.plan_actual !== "ong_pequena");
      if (!esPago) {
        return NextResponse.json({ error: "feature_no_disponible", mensaje: "Integrar tu cara está disponible en los planes de pago." }, { status: 403 });
      }

      let buffer = Buffer.from(await foto.arrayBuffer());
      let mime = foto.type || "";
      if (buffer.byteLength > MAX_FOTO_BYTES) {
        return NextResponse.json({ error: "La foto supera el límite de 8 MB." }, { status: 413 });
      }
      if (esHeic(buffer, mime)) {
        try {
          const heicConvert = (await import("heic-convert")).default;
          buffer = Buffer.from(await heicConvert({ buffer, format: "JPEG", quality: 0.92 }));
          mime = "image/jpeg";
        } catch (e) {
          console.error("generate-image: HEIC integrada falló:", e instanceof Error ? e.message : e);
          return NextResponse.json({ error: "No pudimos procesar tu foto HEIC. Usa una JPEG o PNG." }, { status: 400 });
        }
      } else if (!["image/jpeg", "image/png"].includes(mime)) {
        return NextResponse.json({ error: "Formato de foto no válido (usa JPEG, PNG o HEIC)." }, { status: 400 });
      }

      const aspect = aspectDe(formData);
      const gen = await generarImagenIntegrada(formData.tema, { buffer, mime }, aspect);
      // Sin fallback FLUX: no integra cara. Si falla, el usuario reintenta.
      if (!gen) {
        return NextResponse.json({ error: "No se pudo integrar tu cara en la escena. Inténtalo de nuevo." }, { status: 502 });
      }
      console.log(`generate-image: modo_imagen = integrada (${gen.fuente}, aspect ${aspect})`);

      const filePath = `${user.id}/integrada-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from("post-images").upload(filePath, gen.buffer, { contentType: "image/png", upsert: false });
      if (upErr) {
        console.error("generate-image storage (integrada):", upErr.message);
        return NextResponse.json({ error: "No se pudo guardar la imagen" }, { status: 500 });
      }
      const { data: pub } = supabase.storage.from("post-images").getPublicUrl(filePath);
      return NextResponse.json({ imagenUrl: pub.publicUrl, modelo: gen.fuente, modo: "integrada" });
    }

    // ---------- Modo IA puro: desde prompt (JSON) ----------
    const { formData } = await request.json() as { formData: ContentFormData };
    const aspect = aspectDe(formData);
    const prompt = await construirImagePromptEN(formData.tema, formData.tipoOrganizacion);
    const gen = await generarImagenIA(prompt, aspect);
    if (!gen) return NextResponse.json({ error: "No se pudo generar la imagen" }, { status: 502 });
    console.log(`generate-image: modo_imagen = ia (${gen.fuente}, aspect ${aspect})`);

    const filePath = `${user.id}/post-${Date.now()}.png`;
    const { error: upErr } = await supabase.storage.from("post-images").upload(filePath, gen.buffer, { contentType: "image/png", upsert: false });
    if (upErr) {
      console.error("generate-image storage upload:", upErr.message);
      return NextResponse.json({ error: "No se pudo guardar la imagen" }, { status: 500 });
    }
    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(filePath);
    return NextResponse.json({ imagenUrl: pub.publicUrl, modelo: gen.fuente, modo: "ia" });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
