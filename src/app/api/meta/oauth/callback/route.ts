import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { SITE_URL } from "@/lib/siteUrl";
import { cifrarToken } from "@/lib/crypto-tokens";
import { autopostEnabled, metaOAuthConfigurado, metaRedirectUri } from "@/lib/meta/config";
import { exchangeCodeForUserToken, toLongLivedUserToken, listarPaginasConIG } from "@/lib/meta/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const panel = (qs: string) => NextResponse.redirect(`${SITE_URL}/admin/autopost?${qs}`);
const perfil = (qs: string) => NextResponse.redirect(`${SITE_URL}/perfil?${qs}`);

// Callback del OAuth de Meta: canjea el code, guarda cada Página (con su IG
// vinculado) y su page token cifrado. Solo admin (sesión por cookies).
// Si la cookie meta_oauth_flow=user, es el flujo de USUARIO (conectar sus cuentas
// para publicar): se desvía a handleUserCallback sin tocar el flujo del autopost.
export async function GET(request: NextRequest) {
  if (request.cookies.get("meta_oauth_flow")?.value === "user") {
    return handleUserCallback(request);
  }
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.redirect(`${SITE_URL}/login`);
  if (!autopostEnabled() || !metaOAuthConfigurado()) return panel("error=config");

  const sp = request.nextUrl.searchParams;
  if (sp.get("error")) return panel("error=oauth_denegado");

  const code = sp.get("code");
  const state = sp.get("state");
  const cookieState = request.cookies.get("meta_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) return panel("error=state");

  try {
    const shortToken = await exchangeCodeForUserToken(code, metaRedirectUri());
    // Login clásico: el user token de corta duración (~1h) se intercambia por uno
    // de larga duración (~60d). Los page tokens derivados de ESE user token de
    // larga duración son PERMANENTES (no caducan) → token_expira_at = null.
    let userToken = shortToken;
    let longLived = false;
    try { userToken = await toLongLivedUserToken(shortToken); longLived = true; }
    catch (e) { console.error("autopost oauth: intercambio long-lived falló:", e instanceof Error ? e.message : e); }

    const paginas = await listarPaginasConIG(userToken);
    if (!paginas.length) return panel("error=sin_paginas");

    // Page token permanente si el user token es de larga duración; si el
    // intercambio falló, el page token es de ~1h → marca expiry para que C6 avise.
    const expira = longLived ? null : new Date(Date.now() + 60 * 60 * 1000).toISOString();
    let guardadas = 0;

    for (const p of paginas) {
      const fila = {
        etiqueta: p.ig_username || p.fb_page_nombre,
        fb_page_id: p.fb_page_id,
        fb_page_nombre: p.fb_page_nombre,
        ig_user_id: p.ig_user_id,
        ig_username: p.ig_username,
        token_cifrado: cifrarToken(p.page_token),
        token_expira_at: expira,
        conectada_por: auth.adminId,
        updated_at: new Date().toISOString(),
      };
      // Upsert manual por fb_page_id (el índice único es parcial): update o insert.
      // En INSERT entra activo=false (Fase 1a: Sebas activa solo @o2wave.app a mano;
      // así @go2.bcn queda conectada pero intacta). En UPDATE no tocamos activo.
      const { data: existe } = await auth.admin
        .from("autopost_cuentas").select("id").eq("fb_page_id", p.fb_page_id).maybeSingle();
      const { error } = existe
        ? await auth.admin.from("autopost_cuentas").update(fila).eq("id", existe.id)
        : await auth.admin.from("autopost_cuentas").insert({ ...fila, activo: false });
      if (error) { console.error("autopost callback guardar:", error.message); continue; }
      guardadas++;
    }

    const res = panel(`connected=${guardadas}`);
    res.cookies.set("meta_oauth_state", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("autopost oauth callback:", e instanceof Error ? e.message : e);
    return panel("error=intercambio");
  }
}

// Flujo de USUARIO: guarda las Páginas conectadas (con su IG vinculado y page
// token cifrado) en user_social_accounts para el usuario en sesión. La primera
// cuenta del usuario queda como predeterminada. Redirige a /perfil.
async function handleUserCallback(request: NextRequest): Promise<NextResponse> {
  const clear = (res: NextResponse) => {
    res.cookies.set("meta_oauth_state", "", { path: "/", maxAge: 0 });
    res.cookies.set("meta_oauth_flow", "", { path: "/", maxAge: 0 });
    return res;
  };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return clear(NextResponse.redirect(`${SITE_URL}/login`));
  if (!metaOAuthConfigurado()) return clear(perfil("social_error=config"));

  const sp = request.nextUrl.searchParams;
  if (sp.get("error")) return clear(perfil("social_error=denegado"));
  const code = sp.get("code");
  const state = sp.get("state");
  const cookieState = request.cookies.get("meta_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) return clear(perfil("social_error=state"));

  try {
    const shortToken = await exchangeCodeForUserToken(code, metaRedirectUri());
    let userToken = shortToken;
    let longLived = false;
    try { userToken = await toLongLivedUserToken(shortToken); longLived = true; }
    catch (e) { console.error("user oauth long-lived falló:", e instanceof Error ? e.message : e); }

    const paginas = await listarPaginasConIG(userToken);
    if (!paginas.length) return clear(perfil("social_error=sin_paginas"));

    const expira = longLived ? null : new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const admin = createAdminClient();

    // Si el usuario aún no tiene cuentas, la primera nueva será la predeterminada.
    const { count } = await admin.from("user_social_accounts")
      .select("id", { count: "exact", head: true }).eq("user_id", user.id);
    let sinDefault = (count ?? 0) === 0;
    let guardadas = 0;

    for (const p of paginas) {
      const fila = {
        user_id: user.id,
        etiqueta: p.ig_username || p.fb_page_nombre,
        red: "meta",
        fb_page_id: p.fb_page_id,
        fb_page_nombre: p.fb_page_nombre,
        ig_user_id: p.ig_user_id,
        ig_username: p.ig_username,
        token_cifrado: cifrarToken(p.page_token),
        token_expira_at: expira,
        activo: true,
        updated_at: new Date().toISOString(),
      };
      const { data: existe } = await admin.from("user_social_accounts")
        .select("id").eq("user_id", user.id).eq("fb_page_id", p.fb_page_id).maybeSingle();
      if (existe) {
        const { error } = await admin.from("user_social_accounts").update(fila).eq("id", existe.id);
        if (error) { console.error("user social update:", error.message); continue; }
      } else {
        const { error } = await admin.from("user_social_accounts").insert({ ...fila, es_predeterminada: sinDefault });
        if (error) { console.error("user social insert:", error.message); continue; }
        if (sinDefault) sinDefault = false;
      }
      guardadas++;
    }

    return clear(perfil(`social_connected=${guardadas}`));
  } catch (e) {
    console.error("user oauth callback:", e instanceof Error ? e.message : e);
    return clear(perfil("social_error=intercambio"));
  }
}
