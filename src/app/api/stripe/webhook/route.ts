import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { planDesdePrice, priceId, earlyBirdDuration } from "@/lib/plans";
import {
  enviarBienvenida, enviarCancelacionUsuario, enviarFalloCobroUsuario,
  enviarAdminNueva, enviarAdminBaja, enviarAdminFallo,
} from "@/lib/emails";
import type { PlanActual, PlanCiclo, PlanEstado } from "@/types";

/** Intenta resolver el motivo del fallo de cobro desde el PaymentIntent de la factura. */
async function motivoFallo(stripe: Stripe, inv: Stripe.Invoice): Promise<string> {
  const piRef = (inv as unknown as { payment_intent?: string | { id: string } }).payment_intent;
  const piId = typeof piRef === "string" ? piRef : piRef?.id;
  if (piId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(piId);
      if (pi.last_payment_error?.message) return pi.last_payment_error.message;
    } catch { /* noop */ }
  }
  return "No especificado por Stripe";
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function estadoDeStatus(status: string): PlanEstado {
  if (status === "active" || status === "trialing") return "activa";
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "suspendida";
  if (status === "canceled" || status === "incomplete_expired") return "cancelada";
  return "activa";
}

function periodoFin(sub: Stripe.Subscription): string | null {
  const s = sub as unknown as { current_period_end?: number; items?: { data?: { current_period_end?: number }[] } };
  const ts = s.current_period_end ?? s.items?.data?.[0]?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

async function patchPorCustomer(customerId: string, patch: Record<string, unknown>) {
  if (!customerId) return;
  await createAdminClient().from("profiles").update(patch).eq("stripe_customer_id", customerId);
}

/**
 * ¿La cuenta es "embajador" (acceso pro sin pagar)? Si lo es, el webhook NO
 * debe bajar plan_actual al cancelar/actualizar la suscripción. Tolerante: si
 * la columna aún no existe (migración sin aplicar), devuelve false.
 */
async function esEmbajador(customerId: string): Promise<boolean> {
  if (!customerId) return false;
  const { data } = await createAdminClient()
    .from("profiles").select("es_embajador").eq("stripe_customer_id", customerId).single();
  return (data as { es_embajador?: boolean } | null)?.es_embajador === true;
}

/** Convierte una suscripción Early Bird recién creada en un schedule de 2 fases. */
async function convertirEarlyBird(stripe: Stripe, subId: string, ciclo: PlanCiclo) {
  const earlybird = priceId("earlybird", ciclo);
  const standard = priceId("standard", ciclo);
  if (!earlybird || !standard) { console.error("Early Bird: faltan price IDs"); return; }
  try {
    const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subId });
    const start = schedule.phases[0]?.start_date;
    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        { items: [{ price: earlybird, quantity: 1 }], start_date: start, duration: earlyBirdDuration(ciclo) },
        { items: [{ price: standard, quantity: 1 }] }, // fase final sin fin → continúa indefinidamente
      ],
    });
    console.log(`Early Bird ${ciclo}: schedule ${schedule.id} (Fase 1 ${JSON.stringify(earlyBirdDuration(ciclo))} → Standard)`);
  } catch (e) {
    // Reintento del webhook con schedule ya creado, o suscripción ya programada.
    console.error("convertirEarlyBird:", e instanceof Error ? e.message : e);
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = request.headers.get("stripe-signature");
  if (!secret || !sig) return NextResponse.json({ error: "Webhook no configurado" }, { status: 400 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    const raw = await request.text();
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    console.error("Firma de webhook inválida:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const userId = session.metadata?.user_id || session.client_reference_id || "";
        const plan = (session.metadata?.plan || "") as PlanActual;
        const ciclo = (session.metadata?.ciclo || "mensual") as PlanCiclo;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

        // Estado previo (para idempotencia de emails: solo si es una alta nueva).
        const { data: prev } = userId
          ? await createAdminClient().from("profiles")
              .select("nombre_entidad, email, tipo_entidad, stripe_subscription_id").eq("id", userId).single()
          : { data: null };
        const esAltaNueva = !!userId && !prev?.stripe_subscription_id;

        if (userId) {
          await createAdminClient().from("profiles").update({
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subId ?? null,
            plan_actual: plan || null,
            plan_ciclo: ciclo,
            plan_estado: "activa" as PlanEstado,
          }).eq("id", userId);
        }

        // Early Bird → programar el salto a Standard en la renovación.
        if (plan === "earlybird" && subId) await convertirEarlyBird(stripe, subId, ciclo);

        // Emails #1 (usuario) y #4 (admin), solo en alta nueva.
        if (esAltaNueva && prev) {
          let fechaRenovacionISO: string | null = null;
          if (subId) { try { fechaRenovacionISO = periodoFin(await stripe.subscriptions.retrieve(subId)); } catch { /* noop */ } }
          await enviarBienvenida({ to: prev.email || "", nombre: prev.nombre_entidad || "", plan, ciclo, fechaRenovacionISO });
          await enviarAdminNueva({ nombre: prev.nombre_entidad || "", email: prev.email || "", plan, ciclo, tipoEntidad: prev.tipo_entidad || "", stripeCustomerId: customerId || "", fechaISO: new Date().toISOString() });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const price = sub.items.data[0]?.price?.id;
        const mapped = planDesdePrice(price);
        const patch: Record<string, unknown> = {
          stripe_subscription_id: sub.id,
          plan_estado: estadoDeStatus(sub.status),
          plan_periodo_fin: periodoFin(sub),
        };
        // Refleja el plan/ciclo según el precio activo (incluye el salto Early Bird→Standard).
        // Embajador: NO tocar plan_actual/plan_ciclo (conserva pro sin pagar).
        if (mapped && !(await esEmbajador(customerId))) { patch.plan_actual = mapped.plan; patch.plan_ciclo = mapped.ciclo; }
        await patchPorCustomer(customerId, patch);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        const { data: prev } = await createAdminClient().from("profiles")
          .select("nombre_entidad, email, tipo_entidad, plan_actual, plan_ciclo, plan_estado, es_embajador").eq("stripe_customer_id", customerId).single();
        const embajador = (prev as { es_embajador?: boolean } | null)?.es_embajador === true;

        // Embajador: refleja la cancelación en Stripe PERO conserva plan_actual (pro sin pagar).
        if (embajador) {
          await patchPorCustomer(customerId, { plan_estado: "cancelada" as PlanEstado, plan_periodo_fin: null, stripe_subscription_id: null });
          console.log(`[webhook] embajador ${customerId} — skip downgrade de plan_actual`);
          // Aviso interno a admin (registro), pero NO el email de "vuelves al plan gratuito" al usuario.
          if (prev && prev.plan_estado !== "cancelada") {
            const planHad = (prev.plan_actual || "pro") as PlanActual;
            const ciclo = (prev.plan_ciclo || "mensual") as PlanCiclo;
            const startTs = sub.start_date ?? sub.created;
            const fechaInicioISO = startTs ? new Date(startTs * 1000).toISOString() : null;
            await enviarAdminBaja({ nombre: prev.nombre_entidad || "", email: prev.email || "", plan: planHad, ciclo, fechaInicioISO, stripeCustomerId: customerId });
          }
          break;
        }

        await patchPorCustomer(customerId, { plan_estado: "cancelada" as PlanEstado, plan_actual: "ong_pequena" as PlanActual });

        // Emails #2 (usuario) y #5 (admin), solo si no estaba ya cancelada.
        if (prev && prev.plan_estado !== "cancelada") {
          const planHad = (prev.plan_actual || "ong_pequena") as PlanActual;
          const ciclo = (prev.plan_ciclo || "mensual") as PlanCiclo;
          const esOng = (prev.tipo_entidad || "").startsWith("ong");
          const startTs = sub.start_date ?? sub.created;
          const fechaInicioISO = startTs ? new Date(startTs * 1000).toISOString() : null;
          await enviarCancelacionUsuario({ to: prev.email || "", nombre: prev.nombre_entidad || "", plan: planHad, esOng });
          await enviarAdminBaja({ nombre: prev.nombre_entidad || "", email: prev.email || "", plan: planHad, ciclo, fechaInicioISO, stripeCustomerId: customerId });
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        if (customerId) {
          const { data: prev } = await createAdminClient().from("profiles")
            .select("nombre_entidad, email, plan_actual, plan_ciclo, plan_estado").eq("stripe_customer_id", customerId).single();

          await patchPorCustomer(customerId, { plan_estado: "suspendida" as PlanEstado });

          // Emails #3 (usuario) y #6 (admin), solo si no estaba ya suspendida.
          if (prev && prev.plan_estado !== "suspendida") {
            const plan = (prev.plan_actual || "ong_pequena") as PlanActual;
            const ciclo = (prev.plan_ciclo || "mensual") as PlanCiclo;
            const motivo = await motivoFallo(stripe, inv);
            const reintentoTs = (inv as unknown as { next_payment_attempt?: number | null }).next_payment_attempt;
            const fechaReintentoISO = reintentoTs ? new Date(reintentoTs * 1000).toISOString() : null;
            await enviarFalloCobroUsuario({ to: prev.email || "", nombre: prev.nombre_entidad || "", plan, ciclo });
            await enviarAdminFallo({ nombre: prev.nombre_entidad || "", email: prev.email || "", plan, ciclo, motivo, fechaReintentoISO, stripeCustomerId: customerId });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        const periodEndTs = inv.lines?.data?.[0]?.period?.end;
        if (customerId) {
          await patchPorCustomer(customerId, {
            plan_estado: "activa" as PlanEstado,
            ...(periodEndTs ? { plan_periodo_fin: new Date(periodEndTs * 1000).toISOString() } : {}),
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error(`webhook ${event.type} error:`, e instanceof Error ? e.message : e);
    // Devolvemos 200 para que Stripe no reintente indefinidamente errores no recuperables.
    return NextResponse.json({ received: true, warn: "handler error" });
  }
}
