import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { crearNovedadesBlog } from "@/lib/autopost/blogIg";
import { publicarPostAutopost } from "@/lib/autopost/publishPost";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// Disparador manual (solo admin) del blog → Instagram. Parámetros (query):
//   ?dryRun=1        → genera el banner y lo sube, SIN publicar (para previsualizar).
//   ?ignorarCutoff=1 → ignora la fecha de corte (coge la última noticia del blog).
//   ?variante=dark|light → fuerza el color (para pruebas).
//   ?publicar=1      → tras crear la pieza, la publica YA (si no, queda programada).
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("es_admin").eq("id", user.id).maybeSingle();
  if (!(me as { es_admin?: boolean } | null)?.es_admin) {
    return NextResponse.json({ error: "Solo admin" }, { status: 403 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const ignorarCutoff = url.searchParams.get("ignorarCutoff") === "1";
  const variante = url.searchParams.get("variante");
  const publicar = url.searchParams.get("publicar") === "1";
  const max = Number(url.searchParams.get("max") || "1");

  const admin = createAdminClient();
  const res = await crearNovedadesBlog(admin, {
    dryRun, ignorarCutoff, max,
    forzarVariante: variante === "dark" || variante === "light" ? variante : undefined,
  });

  // Si se pide publicar YA, publica inline cada pieza creada (en orden).
  if (res.creadas?.length && publicar) {
    const publicaciones = [];
    for (const pieza of res.creadas) {
      publicaciones.push({ blogId: pieza.blogId, ...(await publicarPostAutopost(admin, pieza.postId!)) });
    }
    return NextResponse.json({ ...res, publicaciones });
  }
  return NextResponse.json(res);
}
