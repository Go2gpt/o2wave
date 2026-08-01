import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdmin } from "@/lib/adminAudit";
import { SITE_URL } from "@/lib/siteUrl";
import { autopostEnabled, metaIgAppId, metaIgRedirectUri } from "@/lib/meta/config";
import { buildIgAuthorizeUrl } from "@/lib/meta/oauth-ig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Inicia el OAuth de Instagram Business Login para una cuenta concreta (?cuenta_id=).
// Solo admin. Guarda state + cuenta_id en cookies para el callback.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.redirect(`${SITE_URL}/login`);
  if (!autopostEnabled() || !metaIgAppId()) return NextResponse.redirect(`${SITE_URL}/admin/autopost?error=ig_config`);

  const cuentaId = request.nextUrl.searchParams.get("cuenta_id") || "";
  if (!cuentaId) return NextResponse.redirect(`${SITE_URL}/admin/autopost?error=ig_sin_cuenta`);

  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildIgAuthorizeUrl(state, metaIgRedirectUri()));
  const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  res.cookies.set("ig_oauth_state", state, opts);
  res.cookies.set("ig_oauth_cuenta", cuentaId, opts);
  return res;
}
