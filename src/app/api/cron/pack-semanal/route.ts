import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { procesarPackJob } from "@/lib/packProcessor";
import { canUseFeature, isPlanActivo } from "@/lib/plans";
import { enviarPackListo } from "@/lib/emails";

export const maxDuration = 300; // hasta 5 min para procesar muchos packs
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cron semanal (Vercel): lunes 07:00 UTC (= 09:00 CEST / 08:00 CET).
// Vercel Cron envía automáticamente `Authorization: Bearer $CRON_SECRET`.
// Genera el pack de la semana actual para cada usuario con pack_semanal_activo
// y plan que incluya la feature. Idempotente por semana: si ya existe un job
// de esta semana, se salta (seguro de re-ejecutar).
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();

  const { data: usuarios, error } = await admin
    .from("profiles")
    .select("id, plan_actual, plan_estado, es_admin, pack_semanal_activo, email, nombre_entidad")
    .eq("pack_semanal_activo", true);

  if (error) {
    console.error("cron pack-semanal: error listando usuarios", error);
    return NextResponse.json({ error: "list_users_failed" }, { status: 500 });
  }

  // fecha_inicio = lunes de la semana actual (UTC). Misma lógica que pack/generar.
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
  const fechaInicio = base.toISOString().slice(0, 10);

  let procesados = 0;
  let fallidos = 0;
  let saltados = 0;

  for (const user of usuarios ?? []) {
    // Gating unificado: feature + plan activo (admin pasa siempre).
    if (!canUseFeature(user, "pack_semanal") || !isPlanActivo(user)) {
      saltados++;
      continue;
    }

    // Idempotencia por semana: si ya hay un job de esta semana (en curso o hecho),
    // no generamos otro. Evita duplicados si el cron se reintenta o el usuario ya
    // generó manualmente esta semana.
    const { data: yaExiste } = await admin
      .from("pack_jobs")
      .select("id")
      .eq("user_id", user.id)
      .eq("fecha_inicio", fechaInicio)
      .in("estado", ["pending", "processing", "done"])
      .limit(1);
    if (yaExiste && yaExiste.length) {
      saltados++;
      continue;
    }

    const { data: job, error: jobErr } = await admin
      .from("pack_jobs")
      .insert({ user_id: user.id, fecha_inicio: fechaInicio, estado: "pending" })
      .select("id")
      .single();
    if (jobErr || !job) {
      console.error("cron pack-semanal: no se pudo crear job", user.id, jobErr);
      fallidos++;
      continue;
    }

    try {
      const result = await procesarPackJob(admin, job.id as string);
      console.log(`cron pack-semanal: OK pack ${result.pack_id} (user ${user.id}, ${result.con_imagen} imágenes, ${result.fallos.length} fallos)`);
      procesados++;
      // Aviso por email (no bloqueante: un fallo aquí no descontabiliza el pack).
      try {
        if (user.email) await enviarPackListo({ to: user.email, nombre: user.nombre_entidad ?? "" });
      } catch (mailErr) {
        console.error("cron pack-semanal: error enviando email pack-listo", user.id, mailErr instanceof Error ? mailErr.message : mailErr);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      console.error("cron pack-semanal: error procesando", user.id, msg);
      // Marcar el job como fallido (sin romper si esto también falla). Igual que pack/generar.
      try {
        await admin.from("pack_jobs").update({ estado: "failed", error_msg: msg.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", job.id);
      } catch { /* noop */ }
      fallidos++;
    }
  }

  return NextResponse.json({ procesados, fallidos, saltados, total: usuarios?.length ?? 0 });
}
