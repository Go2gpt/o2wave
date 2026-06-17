import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1", "heif"];

function esHeic(buffer: Buffer, mime: string): boolean {
  if (mime === "image/heic" || mime === "image/heif") return true;
  if (buffer.length < 12) return false;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  return HEIC_BRANDS.includes(buffer.toString("ascii", 8, 12).toLowerCase());
}

// Sube la FOTO PROPIA del usuario (multipart) para usarla como imagen del post
// en lugar de generar una con IA. La foto viaja en el request (no subida directa
// cliente→Storage, que rompía en Safari iOS). Path con prefijo `propia-` para
// que el resto del flujo sepa que es del usuario (no lleva watermark de IA).
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const fd = await request.formData();
    const foto = fd.get("foto");
    if (!(foto instanceof File)) return NextResponse.json({ error: "Falta la foto" }, { status: 400 });

    let buffer = Buffer.from(await foto.arrayBuffer());
    let mime = foto.type || "";
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "La foto supera el límite de 8 MB." }, { status: 413 });
    }

    // iPhone sube HEIC por defecto → convertir a JPEG (sharp en Vercel no lo decodifica).
    let ext = mime === "image/png" ? "png" : "jpg";
    if (esHeic(buffer, mime)) {
      try {
        const heicConvert = (await import("heic-convert")).default;
        const jpeg = await heicConvert({ buffer, format: "JPEG", quality: 0.92 });
        buffer = Buffer.from(jpeg);
        mime = "image/jpeg";
        ext = "jpg";
      } catch (e) {
        console.error("upload-foto: fallo conversión HEIC:", e instanceof Error ? e.message : e);
        return NextResponse.json({ error: "No pudimos procesar tu foto HEIC. Usa una foto JPEG o PNG." }, { status: 400 });
      }
    } else if (!["image/jpeg", "image/png"].includes(mime)) {
      return NextResponse.json({ error: "Formato no válido (usa JPEG, PNG o HEIC)." }, { status: 400 });
    }

    const filePath = `${user.id}/propia-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("post-images")
      .upload(filePath, buffer, { contentType: mime, upsert: false });
    if (upErr) {
      console.error("upload-foto storage:", upErr.message);
      return NextResponse.json({ error: "No se pudo guardar la foto" }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from("post-images").getPublicUrl(filePath);
    return NextResponse.json({ imagenUrl: pub.publicUrl });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
