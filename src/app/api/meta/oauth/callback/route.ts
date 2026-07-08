import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { SITE_URL } from "@/lib/siteUrl";
import { cifrarToken } from "@/lib/crypto-tokens";
import { autopostEnabled, metaOAuthConfigurado, metaRedirectUri, metaLoginConfigId, TOKEN_TTL_DIAS } from "@/lib/meta/config";
import { exchangeCodeForUserToken, toLongLivedUserToken, listarPaginasConIG } from "@/lib/meta/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const panel = (qs: string) => NextResponse.redirect(`${SITE_URL}/admin/autopost?${qs}`);

// Callback del OAuth de Meta: canjea el code, guarda cada Página (con su IG
// vinculado) y su page token cifrado. Solo admin (sesión por cookies).
export async function GET(request: NextRequest) {
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
    // Business Login (System User) → el token ya es de larga duración: el
    // intercambio a long-lived es best-effort (si falla, usamos el token tal cual).
    let userToken = shortToken;
    try { userToken = await toLongLivedUserToken(shortToken); } catch { /* system user token */ }

    const paginas = await listarPaginasConIG(userToken);
    if (!paginas.length) return panel("error=sin_paginas");

    // System User → sin caducidad práctica (expiry null = permanente/verde).
    const esSystemUser = !!metaLoginConfigId();
    const expira = esSystemUser ? null : new Date(Date.now() + TOKEN_TTL_DIAS * 24 * 60 * 60 * 1000).toISOString();
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
