import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { fetchEntradasBlog } from "@/lib/blog";
import type { PackSemanal, PackDia } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await createClient().auth.getUser();
  return user?.id ?? null;
}

// Lista las últimas noticias publicadas del blog para elegir cuál llevar a redes.
export async function GET() {
  if (!(await getUserId())) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return NextResponse.json({ entradas: await fetchEntradasBlog(8) });
}

// Importa una noticia del blog como día del pack (pendiente de tu revisión). No
// publica: crea el contenido para que lo ajustes y uses el botón «Publicar».
export async function POST(request: Request) {
  const uid = await getUserId();
  if (!uid) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = (await request.json().catch(() => ({}))) as { id?: number };
  if (!id) return NextResponse.json({ error: "Falta el id de la noticia" }, { status: 400 });

  const entrada = (await fetchEntradasBlog(20)).find((e) => e.id === id);
  if (!entrada) return NextResponse.json({ error: "Noticia no encontrada o no publicada" }, { status: 404 });

  const admin = createAdminClient();
  const hoy = new Date().toISOString().slice(0, 10);

  // Copiamos la imagen del blog (WordPress) al almacenamiento propio de o2Wave.
  // Así queda en el MISMO origen que el resto del pack: el botón "Publicar" puede
  // descargarla para el Compartir nativo sin bloqueo CORS (antes fallaba y caía
  // al modal). Si la copia falla, se mantiene la URL de WordPress como respaldo.
  let imagenUrl = entrada.imagenUrl;
  if (imagenUrl) {
    try {
      const imgRes = await fetch(imagenUrl);
      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const ct = imgRes.headers.get("content-type") || "image/png";
        const ext = ct.includes("jpeg") || ct.includes("jpg") ? "jpg" : ct.includes("webp") ? "webp" : "png";
        const path = `blog/${uid}/${id}-${Date.now()}.${ext}`;
        const { error: upErr } = await admin.storage.from("post-images").upload(path, buf, { contentType: ct, upsert: false });
        if (!upErr) imagenUrl = admin.storage.from("post-images").getPublicUrl(path).data.publicUrl;
      }
    } catch { /* mantiene la URL de WordPress si la copia falla */ }
  }

  // tipo "instagram" por defecto; el usuario puede cambiar la red en el editor
  // (re-encuadra la imagen a la medida de esa red).
  const dia: PackDia = {
    fecha: entrada.fecha || hoy,
    nombre_dia: "Noticia",
    tipo: "instagram",
    tema: entrada.titulo,
    imagen_url: imagenUrl,
    imagen_limpia_url: null,
    titular: entrada.titulo.slice(0, 100),
    texto: entrada.texto,
    hashtags: entrada.tags,
    prompt_imagen: null,
    guion_tiktok: null,
    fuente: "ia_sugerencia",
  };

  // Append al pack más reciente del usuario; si no tiene ninguno, crea uno.
  const { data: reciente } = await admin.from("packs_semanales")
    .select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (reciente) {
    const pack = reciente as PackSemanal;
    const dias: PackDia[] = [...(pack.contenido?.dias || [])];
    if (dias.some((d) => d.tema === dia.tema)) {
      return NextResponse.json({ error: "Esa noticia ya está en tu pack" }, { status: 409 });
    }
    dias.push(dia);
    const { error } = await admin.from("packs_semanales").update({ contenido: { dias } }).eq("id", pack.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ pack_id: pack.id, dia_index: dias.length - 1 });
  }

  const { data: nuevo, error } = await admin.from("packs_semanales")
    .insert({ user_id: uid, fecha_inicio: hoy, pdf_url: null, contenido: { dias: [dia] }, email_enviado: false })
    .select("id").single();
  if (error || !nuevo) return NextResponse.json({ error: error?.message || "No se pudo crear el pack" }, { status: 500 });
  return NextResponse.json({ pack_id: nuevo.id, dia_index: 0 });
}
