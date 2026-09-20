import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { metaOAuthConfigurado } from "@/lib/meta/config";
import { publicarPieza, type CuentaPublicable } from "@/lib/meta/publish";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

// Mapea la red del post a la que entiende publicarPieza (solo IG/FB por API Meta).
const RED_MAP: Record<string, "instagram" | "facebook"> = {
  Instagram: "instagram",
  Facebook: "facebook",
};

// Publica un post en la cuenta CONECTADA elegida por el usuario (server-side),
// reutilizando el motor del autopost. Solo IG/FB (X/LinkedIn/TikTok van por
// compartir nativo). Verifica que la cuenta pertenece al usuario en sesión.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!metaOAuthConfigurado()) return NextResponse.json({ error: "Conexión con Meta no configurada" }, { status: 500 });

  const { cuenta_id, texto, imagen_url, red_social } =
    await request.json() as { cuenta_id?: string; texto?: string; imagen_url?: string | null; red_social?: string };

  const red = red_social ? RED_MAP[red_social] : undefined;
  if (!cuenta_id || !red) {
    return NextResponse.json({ error: "Solo se puede publicar directamente en Instagram o Facebook. Para otras redes, usa Compartir." }, { status: 400 });
  }
  if (red === "instagram" && !imagen_url) {
    return NextResponse.json({ error: "Instagram requiere una imagen." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: cuenta } = await admin
    .from("user_social_accounts")
    .select("user_id, fb_page_id, ig_user_id, token_cifrado")
    .eq("id", cuenta_id).maybeSingle();
  if (!cuenta || (cuenta as { user_id: string }).user_id !== user.id) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }
  const c = cuenta as { fb_page_id: string | null; ig_user_id: string | null; token_cifrado: string };
  if (red === "instagram" && !c.ig_user_id) {
    return NextResponse.json({ error: "Esta cuenta no tiene un Instagram Business vinculado." }, { status: 400 });
  }
  if (red === "facebook" && !c.fb_page_id) {
    return NextResponse.json({ error: "Esta cuenta no tiene Página de Facebook." }, { status: 400 });
  }

  try {
    const cuentaPub: CuentaPublicable = { fb_page_id: c.fb_page_id, ig_user_id: c.ig_user_id, token_cifrado: c.token_cifrado };
    const resultado = await publicarPieza(cuentaPub, { texto: texto || "", imagenUrl: imagen_url ?? null, red });
    const r = red === "instagram" ? resultado.instagram : resultado.facebook;
    if (!r?.ok) return NextResponse.json({ error: r?.error || "No se pudo publicar" }, { status: 502 });
    return NextResponse.json({ ok: true, url: r.url, id: r.id });
  } catch (e) {
    console.error("social/publicar:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error al publicar" }, { status: 500 });
  }
}
