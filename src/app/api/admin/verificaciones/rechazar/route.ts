import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getResend, FROM_VERIFICACION, REPLY_TO_VERIFICACION } from "@/lib/resend";
import { SITE_URL } from "@/lib/siteUrl";

export async function POST(request: NextRequest) {
  try {
    const { user_id, motivo, notas } = await request.json();
    if (!user_id) return NextResponse.json({ error: "Falta user_id" }, { status: 400 });
    if (!motivo || !motivo.trim()) {
      return NextResponse.json({ error: "El motivo es obligatorio" }, { status: 400 });
    }
    const motivoLimpio = motivo.trim();

    // 1) Comprobar que el llamante es admin
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: caller } = await supabase
      .from("profiles").select("es_admin").eq("id", user.id).single();
    if (!caller?.es_admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    // 2) Update privilegiado con service role
    const admin = createAdminClient();
    const { data: target, error: updErr } = await admin
      .from("profiles")
      .update({
        estado_verificacion: "rechazada",
        motivo_rechazo: motivoLimpio,
        verification_notes: typeof notas === "string" ? notas : null,
        verification_reviewed_at: new Date().toISOString(),
        verification_reviewed_by: user.id,
      })
      .eq("id", user_id)
      .select("email")
      .single();
    if (updErr || !target) {
      console.error("rechazar update error:", updErr);
      return NextResponse.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
    }

    // 3) Email de rechazo (texto aprobado, firmado por Sebastian). El `motivo`
    // se guarda en BD para el admin; el cuerpo al usuario es el texto estándar.
    if (target.email) {
      await getResend().emails.send({
        from: FROM_VERIFICACION,
        replyTo: REPLY_TO_VERIFICACION,
        to: target.email,
        subject: "Sobre tu inscripción al plan gratuito de o2Wave",
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#0F0F0F;line-height:1.6;font-size:15px">
            <p>Hola,</p>
            <p>He revisado los documentos enviados y veo que vuestra entidad no cumple alguno de los criterios del plan gratuito ONG pequeña:</p>
            <ul style="padding-left:20px">
              <li>Entidad sin ánimo de lucro (CIF G/R/V/N).</li>
              <li>Presupuesto anual inferior a 50.000€.</li>
              <li>Máximo 1 trabajador remunerado.</li>
            </ul>
            <p>Sin embargo, te queremos tener en o2Wave igualmente. Puedes acceder con:</p>
            <ul style="padding-left:20px">
              <li>Pro Nonprofit: 1,95€/mes (para ONG con CIF/NIF verificado).</li>
              <li>Pro: 4,95€/mes.</li>
            </ul>
            <p>Detalles en <a href="${SITE_URL}/plans" style="color:#93bf30;font-weight:bold">o2wave.app/plans</a>.</p>
            <p>Si quieres seguir con un plan de pago, házmelo saber y te ayudo a configurarlo.</p>
            <p>Un abrazo,</p>
            <p style="margin-top:16px"><strong>Sebastian Ferragut</strong><br/>
            Presidente · Asociación Generación o2 (Go2)</p>
          </div>`,
      });
      console.log("[email-rechazo] enviado a", target.email);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("rechazar error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
