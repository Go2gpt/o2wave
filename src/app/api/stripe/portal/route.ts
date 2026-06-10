import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getStripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/siteUrl";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Genera una sesión del Stripe Billing Portal para el usuario autenticado.
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "no_autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("stripe_customer_id, es_admin").eq("id", user.id).single();

  if (profile?.es_admin) {
    return NextResponse.json({ error: "admin_sin_suscripcion", mensaje: "Las cuentas admin no tienen suscripción gestionable." }, { status: 400 });
  }
  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "sin_suscripcion", mensaje: "No tienes una suscripción activa." }, { status: 400 });
  }

  try {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${SITE_URL}/perfil`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    console.error("stripe portal error:", msg);
    return NextResponse.json({ error: "portal_error", mensaje: "No se pudo abrir el portal de suscripción." }, { status: 500 });
  }
}
