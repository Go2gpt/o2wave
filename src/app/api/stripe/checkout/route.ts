import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import { priceId } from "@/lib/plans";
import type { PlanActual, PlanCiclo } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PLANES_VALIDOS: PlanActual[] = ["ong_mediana", "earlybird", "standard", "pro"];

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
      .from("profiles").select("stripe_customer_id, nombre_entidad").eq("id", user.id).single();

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

    const origin = request.nextUrl.origin;
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
      success_url: `${origin}/plans?success=1`,
      cancel_url: `${origin}/plans?cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    console.error("stripe checkout error:", msg);
    return NextResponse.json({ error: `Error en checkout: ${msg}` }, { status: 500 });
  }
}
