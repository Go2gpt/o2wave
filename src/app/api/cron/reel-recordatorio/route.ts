import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { autopostEnabled } from "@/lib/meta/config";
import { enviarRecordatorioReel } from "@/lib/emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron semanal (Vercel): jueves. Recuerda por email que toca crear y publicar el
// Reel de la semana (mientras el Reel sea manual). No publica nada.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!autopostEnabled()) return NextResponse.json({ skipped: "autopost_disabled" });

  const admin = createAdminClient();
  const { data } = await admin
    .from("autopost_cuentas").select("etiqueta")
    .eq("activo", true).eq("perfil_publicacion", "producto");
  const cuentas = (data || []).map((c) => c.etiqueta as string).join(", ") || "tu cuenta de o2Wave";

  await enviarRecordatorioReel({ cuentas });
  return NextResponse.json({ ok: true, cuentas });
}
