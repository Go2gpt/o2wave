import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getResend, FROM_VERIFICACION, REPLY_TO_VERIFICACION } from "@/lib/resend";
import { SITE_URL } from "@/lib/siteUrl";

// Pide aclaración/documentación adicional a la entidad: estado 'necesita_info'
// + email con el mensaje editable del admin. Igual que aprobar/rechazar, valida
// que el llamante es admin y usa service role para el update.
export async function POST(request: NextRequest) {
  try {
    const { user_id, mensaje, notas } = await request.json();
    if (!user_id) return NextResponse.json({ error: "Falta user_id" }, { status: 400 });
    if (!mensaje || !mensaje.trim()) {
      return NextResponse.json({ error: "El mensaje es obligatorio" }, { status: 400 });
    }
    const mensajeLimpio = mensaje.trim();

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: caller } = await supabase
      .from("profiles").select("es_admin").eq("id", user.id).single();
    if (!caller?.es_admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const admin = createAdminClient();
    const { data: target, error: updErr } = await admin
      .from("profiles")
      .update({
        estado_verificacion: "necesita_info",
        motivo_rechazo: mensajeLimpio, // reutilizamos el campo para el detalle mostrado al usuario
        verification_notes: typeof notas === "string" ? notas : null,
        verification_reviewed_at: new Date().toISOString(),
        verification_reviewed_by: user.id,
      })
      .eq("id", user_id)
      .select("email")
      .single();
    if (updErr || !target) {
      console.error("aclaracion update error:", updErr);
      return NextResponse.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
    }

    if (target.email) {
      // El cuerpo principal es el mensaje que escribe el admin (notas/motivo);
      // conservamos sus saltos de línea. Saludo y firma estándar.
      const cuerpo = mensajeLimpio.replace(/\n/g, "<br/>");
      await getResend().emails.send({
        from: FROM_VERIFICACION,
        replyTo: REPLY_TO_VERIFICACION,
        to: target.email,
        subject: "Sobre tu inscripción a o2Wave — documentos pendientes",
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#0F0F0F;line-height:1.6;font-size:15px">
            <p>Hola,</p>
            <p>${cuerpo}</p>
            <p>Puedes responder a este correo o subir la documentación entrando en
            <a href="${SITE_URL}/verificacion" style="color:#93bf30;font-weight:bold">o2wave.app/verificacion</a>.</p>
            <p>Un abrazo,</p>
            <p style="margin-top:16px"><strong>Sebastian Ferragut</strong><br/>
            Presidente · Asociación Generación o2 (Go2)</p>
          </div>`,
      });
      console.log("[email-aclaracion] enviado a", target.email);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("aclaracion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
