import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getResend, FROM_EMAIL } from "@/lib/resend";
import { SITE_URL } from "@/lib/siteUrl";
import { NOTIFICATION_EMAIL } from "@/lib/emails";

const TIPO_LABEL: Record<string, string> = {
  ong_pequena: "ONG pequeña",
  ong_mediana: "ONG mediana",
};

export async function POST() {
  try {
    // Usuario autenticado (sesión por cookies, sin service role)
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("nombre_entidad, nif, tipo_entidad, email")
      .eq("id", user.id)
      .single();

    // Solo ONGs disparan el aviso
    if (profile?.tipo_entidad !== "ong_pequena" && profile?.tipo_entidad !== "ong_mediana") {
      return NextResponse.json({ ok: true });
    }

    const nombre = profile.nombre_entidad || profile.email || "(sin nombre)";
    const tipo = TIPO_LABEL[profile.tipo_entidad];

    // El envío no debe romper el flujo: si falla, log y respondemos 200 igual.
    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: NOTIFICATION_EMAIL,
        subject: "Nueva verificación pendiente en o2Wave",
        html: `
          <div style="font-family:Arial,sans-serif;color:#0F0F0F;line-height:1.6">
            <h2 style="color:#93bf30;margin-bottom:8px">Nueva verificación pendiente</h2>
            <p>Una organización ha subido un documento y espera revisión:</p>
            <table style="font-size:14px;margin:12px 0">
              <tr><td style="color:#6b7280;padding:2px 12px 2px 0">Entidad</td><td><strong>${nombre}</strong></td></tr>
              <tr><td style="color:#6b7280;padding:2px 12px 2px 0">NIF</td><td>${profile.nif || "—"}</td></tr>
              <tr><td style="color:#6b7280;padding:2px 12px 2px 0">Tipo</td><td>${tipo}</td></tr>
            </table>
            <p style="margin-top:16px">
              <a href="${SITE_URL}/login?redirect=/admin/verificaciones"
                 style="display:inline-block;background:#f9b23b;color:#0F0F0F;font-weight:bold;text-decoration:none;padding:10px 18px;border-radius:10px">
                Revisar verificaciones
              </a>
            </p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px">o2Wave · aviso automático</p>
          </div>`,
      });
    } catch (mailErr) {
      console.error("notificar-admin email error:", mailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("notificar-admin error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 }
    );
  }
}
