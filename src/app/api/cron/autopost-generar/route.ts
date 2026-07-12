import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { autopostEnabled } from "@/lib/meta/config";
import { generarPiezasAutopost, type CuentaGen } from "@/lib/autopost/generator";
import { enviarAutopostRevision } from "@/lib/emails";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron semanal (Vercel): lunes 08:00 UTC. Genera el pack de autopost para cada
// cuenta interna activa de perfil "producto" (Fase 1a) y avisa a Sebas.
// @go2.bcn queda fuera: perfil ong_general o activo=false (Fase 1b aparte).
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!autopostEnabled()) return NextResponse.json({ skipped: "autopost_disabled" });

  const admin = createAdminClient();
  const { data: cuentas, error } = await admin
    .from("autopost_cuentas").select("*")
    .eq("activo", true).eq("perfil_publicacion", "producto");
  if (error) {
    console.error("cron autopost-generar: error listando cuentas", error.message);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  // Lunes de la semana actual (UTC), misma lógica que el cron del pack.
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
  const semanaInicio = base.toISOString().slice(0, 10);
  const semanaIdx = Math.floor(base.getTime() / (7 * 24 * 3600 * 1000));

  const resultados = [];
  for (const c of cuentas ?? []) {
    resultados.push(await generarPiezasAutopost(admin, c as unknown as CuentaGen, semanaInicio, semanaIdx));
  }

  const pendientes = resultados.reduce((s, r) => s + r.pendientes, 0);
  const programadas = resultados.reduce((s, r) => s + r.programadas, 0);
  if (pendientes > 0 || programadas > 0) {
    const detalle = resultados.filter((r) => r.generadas > 0).map((r) => `${r.cuenta}: ${r.generadas}`).join(" · ");
    await enviarAutopostRevision({ pendientes, programadas, detalle });
  }

  console.log(`cron autopost-generar: semana ${semanaInicio} → ${JSON.stringify(resultados)}`);
  return NextResponse.json({ semanaInicio, resultados });
}
