import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import { priceId } from "@/lib/plans";
import { SITE_URL } from "@/lib/siteUrl";
import type { PlanActual, PlanCiclo } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Planes cobrables en v3.0. Free no pasa por checkout (sin producto Stripe).
const PLANES_VALIDOS: PlanActual[] = ["pro", "pro_nonprofit"];

export async function POST(request: NextRequest) {
  try {
    const { plan, ciclo } = await request.json() as { plan: PlanActual; ciclo: PlanCiclo };
    if (!PLANES_VALIDOS.includes(plan) || (ciclo !== "mensual" && ciclo !== "anual")) {
      return NextResponse.json({ error: "Plan o ciclo inválido" }, { status: 400 });
    }
    const price = priceId(plan, ciclo);
    if (!price) return NextResponse.json({ error: "Precio no configurado para este plan" }, { status: 500 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles").select("stripe_customer_id, nombre_entidad, estado_verificacion").eq("id", user.id).single();

    // Gating Pro Nonprofit (1,99€): solo ONG con CIF/NIF verificado. Sin verificar
    // → se le redirige a contratar Pro normal (4,90€) o a completar la verificación.
    if (plan === "pro_nonprofit" && profile?.estado_verificacion !== "verificada") {
      return NextResponse.json(
        { error: "El plan Pro Nonprofit (1,99€) requiere verificar el CIF/NIF de tu ONG. Verifícalo primero o contrata Pro (4,90€).", code: "cif_no_verificado" },
        { status: 403 },
      );
    }

    const stripe = getStripe();

    // Customer: reutilizar el existente o crear uno y guardarlo.
    let customerId = profile?.stripe_customer_id || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: profile?.nombre_entidad || undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await createAdminClient().from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      customer_update: { address: "auto", name: "auto" },
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan, ciclo },
      subscription_data: { metadata: { user_id: user.id, plan, ciclo } },
      success_url: `${SITE_URL}/dashboard?success=1`,
      cancel_url: `${SITE_URL}/plans?cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    console.error("stripe checkout error:", msg);
    return NextResponse.json({ error: `Error en checkout: ${msg}` }, { status: 500 });
  }
}
