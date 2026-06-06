import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getResend, FROM_EMAIL } from "@/lib/resend";

const TIPO_LABEL: Record<string, string> = {
  ong_pequena: "ONG pequeña",
  ong_mediana: "ONG mediana",
  empresa: "Empresa",
};

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json();
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
      .update({ estado_verificacion: "verificada", motivo_rechazo: null })
      .eq("id", user_id)
      .select("email, tipo_entidad")
      .single();
    if (updErr || !target) {
      console.error("aprobar update error:", updErr);
      return NextResponse.json({ error: "No se pudo actualizar el perfil" }, { status: 500 });
    }

    // 3) Email de aviso
    if (target.email) {
      const tipo = TIPO_LABEL[target.tipo_entidad] || "organización";
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: target.email,
        subject: "Tu organización ha sido verificada en o2Wave",
        html: `
          <div style="font-family:Arial,sans-serif;color:#0F0F0F;line-height:1.6">
            <h2 style="color:#93bf30;margin-bottom:8px">¡Verificación completada! 🎉</h2>
            <p>Hola,</p>
            <p>Hemos verificado tu ${tipo} en <strong>o2Wave</strong>. Tu cuenta ya está activa
            y puedes acceder a <strong>todas las funciones</strong> de tu plan.</p>
            <p>Entra y empieza a generar contenido para tu comunidad.</p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px">Comunicas tú, ayudas a muchos.<br/>El equipo de o2Wave</p>
          </div>`,
      });
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
