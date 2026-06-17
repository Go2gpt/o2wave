import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Activa/desactiva el programa opt-in de mención a Generación o2 (10% dto).
// - Persiste profiles.acepta_mencion_go2.
// - Registra el consentimiento (RGPD) en logs_consentimiento.
// - Aplica/quita el cupón en la suscripción de Stripe (best-effort: si no hay
//   cupón configurado o el usuario no tiene suscripción activa, no falla; el
//   flag y el log se guardan igual).
export async function POST(request: NextRequest) {
  try {
    const { activar } = await request.json() as { activar: boolean };
    const acepta = activar === true;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const admin = createAdminClient();

    // 1) Persistir el flag.
    const { error: updErr } = await admin
      .from("profiles").update({ acepta_mencion_go2: acepta }).eq("id", user.id);
    if (updErr) {
      console.error("mencion-go2 update error:", updErr.message);
      return NextResponse.json({ error: "No se pudo guardar tu preferencia" }, { status: 500 });
    }

    // 2) Trazabilidad de consentimiento (RGPD).
    await admin.from("logs_consentimiento").insert({
      user_id: user.id,
      tipo: "mencion_go2",
      evento: acepta ? "activado" : "desactivado",
    });

    // 3) Stripe: aplicar/quitar el cupón en la suscripción activa (guardado).
    let descuentoAplicado = false;
    try {
      const coupon = process.env.STRIPE_COUPON_MENCION_GO2;
      const { data: prof } = await admin
        .from("profiles").select("stripe_subscription_id").eq("id", user.id).single();
      const subId = prof?.stripe_subscription_id || null;
      if (subId && coupon) {
        const stripe = getStripe();
        if (acepta) {
          await stripe.subscriptions.update(subId, { discounts: [{ coupon }] });
          descuentoAplicado = true;
        } else {
          await stripe.subscriptions.deleteDiscount(subId);
        }
      }
    } catch (e) {
      // No bloqueamos el toggle por un fallo de Stripe; queda registrado.
      console.error("mencion-go2 stripe error:", e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ ok: true, acepta, descuentoAplicado });
  } catch (error) {
    return NextResponse.json({ error: `Error: ${error instanceof Error ? error.message : "desconocido"}` }, { status: 500 });
  }
}
