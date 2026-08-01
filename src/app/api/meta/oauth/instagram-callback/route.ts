import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { SITE_URL } from "@/lib/siteUrl";
import { cifrarToken } from "@/lib/crypto-tokens";
import { autopostEnabled, metaIgAppId, metaIgAppSecret, metaIgRedirectUri } from "@/lib/meta/config";
import { exchangeIgCodeForToken, toLongLivedIgToken, fetchIgUsername } from "@/lib/meta/oauth-ig";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const panel = (qs: string) => NextResponse.redirect(`${SITE_URL}/admin/autopost?${qs}`);

// Callback del OAuth de Instagram: canjea code → token corto → long-lived,
// resuelve el username y guarda el IG token cifrado en la cuenta. Solo admin.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.redirect(`${SITE_URL}/login`);
  if (!autopostEnabled() || !metaIgAppId()) return panel("error=ig_config");

  const sp = request.nextUrl.searchParams;
  if (sp.get("error")) return panel("error=ig_denegado");

  const code = sp.get("code");
  const state = sp.get("state");
  const cookieState = request.cookies.get("ig_oauth_state")?.value;
  const cuentaId = request.cookies.get("ig_oauth_cuenta")?.value;
  if (!code || !state || !cookieState || state !== cookieState || !cuentaId) return panel("error=ig_state");

  // Diagnóstico: expone exactamente qué redirect_uri/appId se usan en el
  // exchange (JSON.stringify revela espacios/saltos ocultos). Nunca loguea el secret.
  const ru = metaIgRedirectUri();
  console.log(`ig callback: redirect_uri=${JSON.stringify(ru)} appId=${JSON.stringify(metaIgAppId())} secretLen=${metaIgAppSecret().length}`);

  try {
    const { accessToken: shortToken, userId } = await exchangeIgCodeForToken(code, ru);
    const { token, expiresIn } = await toLongLivedIgToken(shortToken);
    const username = await fetchIgUsername(userId, token);
    const expira = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error } = await auth.admin.from("autopost_cuentas").update({
      ig_user_id: userId,
      ig_username: username,
      ig_token_cifrado: cifrarToken(token),
      ig_token_expira_at: expira,
      updated_at: new Date().toISOString(),
    }).eq("id", cuentaId);
    if (error) { console.error("ig callback guardar:", error.message); return panel("error=ig_guardar"); }

    const res = panel("ig_connected=1");
    res.cookies.set("ig_oauth_state", "", { path: "/", maxAge: 0 });
    res.cookies.set("ig_oauth_cuenta", "", { path: "/", maxAge: 0 });
    return res;
  } catch (e) {
    console.error("ig oauth callback:", e instanceof Error ? e.message : e);
    return panel("error=ig_intercambio");
  }
}
