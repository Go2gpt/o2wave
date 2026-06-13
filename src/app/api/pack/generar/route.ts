import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { procesarPackJob } from "@/lib/packProcessor";
import { enviarPackListo } from "@/lib/emails";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Genera un pack de la semana actual de forma SÍNCRONA para el usuario logueado.
// (No usa CRON_TOKEN; es una acción del propio usuario desde la UI.)
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("pack_semanal_activo, nombre_entidad").eq("id", user.id).single();
  if (!profile?.pack_semanal_activo) {
    return NextResponse.json({ error: "Activa el pack semanal automático en tu perfil para poder generarlo." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Anti-abuso 1: ¿hay ya un job en curso?
  const { data: enCurso } = await admin.from("pack_jobs").select("id").eq("user_id", user.id).in("estado", ["pending", "processing"]).limit(1);
  if (enCurso && enCurso.length) {
    return NextResponse.json({ error: "Ya hay un pack en proceso. Espera a que termine." }, { status: 429 });
  }
  // Anti-abuso 2: ¿ya se generó un pack hoy?
  const inicioHoy = new Date(); inicioHoy.setUTCHours(0, 0, 0, 0);
  const { data: reciente } = await admin.from("packs_semanales").select("id").eq("user_id", user.id).gte("created_at", inicioHoy.toISOString()).limit(1);
  if (reciente && reciente.length) {
    return NextResponse.json({ error: "Ya has generado un pack hoy. Edítalo en tu pack o vuelve mañana." }, { status: 429 });
  }

  // fecha_inicio = lunes de la semana actual (UTC).
  const base = new Date(); base.setUTCHours(0, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
  const fechaInicio = base.toISOString().slice(0, 10);

  const { data: job, error: jobErr } = await admin
    .from("pack_jobs").insert({ user_id: user.id, fecha_inicio: fechaInicio, estado: "pending" }).select("id").single();
  if (jobErr || !job) return NextResponse.json({ error: "No se pudo crear el trabajo del pack." }, { status: 500 });

  console.log(`pack/generar: job ${job.id} (user ${user.id}, semana ${fechaInicio})`);
  try {
    const result = await procesarPackJob(admin, job.id as string);
    console.log(`pack/generar: OK pack ${result.pack_id} (${result.con_imagen} imágenes, ${result.fallos.length} fallos)`);
    // Aviso por email con deep-link al pack (no bloqueante: igual patrón que el cron).
    try {
      if (user.email) await enviarPackListo({ to: user.email, nombre: profile?.nombre_entidad ?? "", packId: result.pack_id });
    } catch (mailErr) {
      console.error("pack/generar: error enviando email pack-listo", mailErr instanceof Error ? mailErr.message : mailErr);
    }
    return NextResponse.json({ ok: true, pack_id: result.pack_id, con_imagen: result.con_imagen });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    console.error("pack/generar error:", msg);
    try {
      await admin.from("pack_jobs").update({ estado: "failed", error_msg: msg.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", job.id);
    } catch { /* noop */ }
    return NextResponse.json({ error: `No se pudo generar el pack: ${msg}` }, { status: 500 });
  }
}
