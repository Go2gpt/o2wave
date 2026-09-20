import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase-server";
import { SITE_URL } from "@/lib/siteUrl";
import { metaOAuthConfigurado, metaRedirectUri } from "@/lib/meta/config";
import { buildAuthorizeUrl } from "@/lib/meta/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Inicia el OAuth de Meta para un USUARIO (conectar su Página FB + IG Business y
// poder publicar server-side). Reutiliza el MISMO redirect_uri que el autopost
// (ya whitelisted en la Meta App); el callback distingue el flujo por la cookie
// meta_oauth_flow=user. No depende de AUTOPOST_ENABLED (eso es el cron interno).
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${SITE_URL}/login`);

  if (!metaOAuthConfigurado()) {
    return NextResponse.redirect(`${SITE_URL}/perfil?social_error=config`);
  }

  const state = crypto.randomBytes(16).toString("hex");
  const url = buildAuthorizeUrl(state, metaRedirectUri());

  const res = NextResponse.redirect(url);
  const cookie = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  res.cookies.set("meta_oauth_state", state, cookie);
  res.cookies.set("meta_oauth_flow", "user", cookie);
  return res;
}
