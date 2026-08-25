import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { bannerMarca } from "@/lib/composeImage";
import { aspectPorRed } from "@/lib/aspectPorRed";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * Genera un banner de marca tipográfico para el flujo "Crear contenido" (post
 * suelto) y lo sube a post-images. El fichero lleva prefijo `banner-` para que la
 * página de resultado lo trate como imagen FINAL (sin editor de titular superpuesto,
 * sin recompose). Solo servidor.
 */
export async function POST(request: Request) {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { titulo, subtitulo, pill, variante, red, organizacion } = (await request.json().catch(() => ({}))) as {
    titulo?: string; subtitulo?: string; pill?: string; variante?: string; red?: string; organizacion?: string;
  };
  if (!titulo || !titulo.trim()) return NextResponse.json({ error: "Falta el título" }, { status: 400 });

  try {
    const png = await bannerMarca({
      aspectRatio: aspectPorRed(red || "Instagram"),
      variante: variante === "light" ? "light" : "dark",
      pill: (pill || "").trim(),
      titulo: titulo.trim(),
      subtitulo: (subtitulo || "").trim() || null,
      organizacion: (organizacion || "").trim() || null,
    });
    const admin = createAdminClient();
    const path = `${user.id}/banner-${Date.now()}.png`;
    const { error } = await admin.storage.from("post-images").upload(path, png, { contentType: "image/png", upsert: false });
    if (error) return NextResponse.json({ error: `storage: ${error.message}` }, { status: 500 });
    return NextResponse.json({ imagenUrl: admin.storage.from("post-images").getPublicUrl(path).data.publicUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error generando banner" }, { status: 500 });
  }
}
