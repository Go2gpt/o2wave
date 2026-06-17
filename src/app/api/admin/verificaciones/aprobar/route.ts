import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getResend, FROM_VERIFICACION, REPLY_TO_VERIFICACION } from "@/lib/resend";

export async function POST(request: NextRequest) {
  try {
    const { user_id, notas } = await request.json();
    if (!user_id) return NextResponse.json({ error: "Falta user_id" }, { status: 400 });

    // 1) Comprobar que el llamante es admin (sesión por cookies)
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: caller } = await supabase
      .from("profiles").select("es_admin").eq("id", user.id).single();
    if (!caller?.es_admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    // 2) Update privilegiado con service role (omite RLS)
    const admin = createAdminClient();
    const { data: target, error: updErr } = await admin
      .from("profiles")
      .update({
        estado_verificacion: "verificada",
        motivo_rechazo: null,
        verification_notes: typeof notas === "string" ? notas : null,
        verification_reviewed_at: new Date().toISOString(),
        verification_reviewed_by: user.id,
      })
      .eq("id", user_id)
      .select("email, nombre_entidad")
      .single();
    if (updErr || !target) {
      console.error("aprobar update error:", updErr);
      return NextResponse.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
    }

    // 3) Email de aprobación (texto aprobado, firmado por Sebastian)
    if (target.email) {
      await getResend().emails.send({
        from: FROM_VERIFICACION,
        replyTo: REPLY_TO_VERIFICACION,
        to: target.email,
        subject: "¡Bienvenidos a o2Wave! Plan gratuito ONG pequeña aprobado",
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;color:#0F0F0F;line-height:1.6;font-size:15px">
            <p>Hola,</p>
            <p>Soy Sebastian Ferragut, presidente de Generación o2 (Go2). Te escribo personalmente porque vuestra organización es una de las primeras ONGs en confiar en o2Wave desde su lanzamiento en beta. Gracias.</p>
            <p>Hemos revisado los documentos y el plan ONG pequeña gratuito ya está activo en vuestra cuenta. Ya podéis empezar a generar contenido cuando queráis desde <a href="https://o2wave.app" style="color:#93bf30;font-weight:bold">o2wave.app</a>:</p>
            <ul style="padding-left:20px">
              <li>10 publicaciones al mes con IA (texto + imagen).</li>
              <li>Publicación en Instagram y Facebook.</li>
              <li>Calendario de días clave por sector.</li>
              <li>Estadísticas básicas.</li>
            </ul>
            <p>Pequeña petición: ¿podríais probar a generar 1-2 posts esta semana y contarnos qué tal os ha ido? Aún estamos en beta y vuestro feedback es lo que nos ayuda a construir un producto que de verdad os sirva. Cualquier cosa que veáis rara, os cueste o echéis de menos, decírnoslo.</p>
            <p>Si tenéis cualquier duda sobre cómo funciona algo, respondéis a este correo y os ayudamos.</p>
            <p>Mil gracias por estar ahí desde el principio.</p>
            <p>Un abrazo,</p>
            <p style="margin-top:16px"><strong>Sebastian Ferragut</strong><br/>
            Presidente · Asociación Generación o2 (Go2)<br/>
            <a href="https://o2wave.app" style="color:#93bf30">o2wave.app</a></p>
          </div>`,
      });
      console.log("[email-aprobacion] enviado a", target.email);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("aprobar error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
