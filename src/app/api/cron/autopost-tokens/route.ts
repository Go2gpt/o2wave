import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { autopostEnabled, META_GRAPH } from "@/lib/meta/config";
import { descifrarToken } from "@/lib/crypto-tokens";
import { enviarAutopostToken } from "@/lib/emails";

export const maxDuration = 120;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron diario: valida los tokens de las cuentas activas y avisa a Sebas si un
// token está caducado/revocado o caduca en <=7 días (System User no caduca, pero
// igualmente se comprueba que sigue siendo válido). No auto-renueva: el page
// token no se puede refrescar sin re-login, así que el aviso pide reconectar.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!autopostEnabled()) return NextResponse.json({ skipped: "autopost_disabled" });

  const admin = createAdminClient();
  const { data: cuentas } = await admin
    .from("autopost_cuentas").select("id, etiqueta, token_cifrado, token_expira_at, activo").eq("activo", true);

  const avisos: { cuenta: string; motivo: string }[] = [];

  for (const c of cuentas ?? []) {
    let motivo = "";
    // 1) Validez real del token (detecta revocados/expirados).
    try {
      const token = descifrarToken(c.token_cifrado);
      const res = await fetch(`${META_GRAPH}/me?fields=id&access_token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json?.error || !json?.id) {
        motivo = `Token inválido o revocado (${json?.error?.message || res.status}). Reconecta la cuenta.`;
      }
    } catch (e) {
      motivo = `No se pudo validar el token (${e instanceof Error ? e.message : "error"}).`;
    }
    // 2) Caducidad próxima (solo si tiene fecha de expiración).
    if (!motivo && c.token_expira_at) {
      const dias = (new Date(c.token_expira_at).getTime() - Date.now()) / 86400000;
      if (dias <= 7) motivo = `El token caduca en ${Math.max(0, Math.round(dias))} día(s). Reconecta la cuenta para renovarlo.`;
    }
    if (motivo) {
      avisos.push({ cuenta: c.etiqueta, motivo });
      await enviarAutopostToken({ cuenta: c.etiqueta, motivo });
    }
  }

  console.log(`cron autopost-tokens: ${avisos.length} aviso(s) → ${JSON.stringify(avisos.map((a) => a.cuenta))}`);
  return NextResponse.json({ revisadas: (cuentas ?? []).length, avisos });
}
