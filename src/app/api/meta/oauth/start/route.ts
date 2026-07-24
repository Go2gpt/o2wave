import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdmin } from "@/lib/adminAudit";
import { SITE_URL } from "@/lib/siteUrl";
import { autopostEnabled, metaOAuthConfigurado, metaRedirectUri } from "@/lib/meta/config";
import { buildAuthorizeUrl } from "@/lib/meta/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Inicia el OAuth de Meta (solo admin). Redirige al diálogo de autorización.
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.redirect(`${SITE_URL}/login`);

  if (!autopostEnabled() || !metaOAuthConfigurado()) {
    return NextResponse.redirect(`${SITE_URL}/admin/autopost?error=config`);
  }

  // state anti-CSRF: cookie httpOnly que verificamos en el callback.
  const state = crypto.randomBytes(16).toString("hex");
  const url = buildAuthorizeUrl(state, metaRedirectUri());

  const res = NextResponse.redirect(url);
  res.cookies.set("meta_oauth_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600,
  });
  return res;
}
