import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAudit";
import { createAdminClient } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CANTIDAD_DEFECTO = 100;
const CANTIDAD_MAXIMA = 200;

function generarCodigo(): string {
  let sufijo = "";
  for (let i = 0; i < 6; i++) {
    sufijo += ALFABETO[crypto.randomInt(ALFABETO.length)];
  }
  return `GO2BETA-${sufijo}`;
}

// Genera códigos de invitación del programa Beta (cupón Stripe 100% x 6 meses). Solo admin.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const couponId = process.env.STRIPE_BETA_COUPON_ID;
  if (!couponId) return NextResponse.json({ error: "Falta STRIPE_BETA_COUPON_ID" }, { status: 500 });

  let cantidad = CANTIDAD_DEFECTO;
  try {
    const body = await request.json();
    if (typeof body?.cantidad === "number" && Number.isFinite(body.cantidad)) {
      cantidad = Math.floor(body.cantidad);
    }
  } catch {
    // Sin body: usamos el valor por defecto.
  }
  cantidad = Math.max(1, Math.min(cantidad, CANTIDAD_MAXIMA));

  const admin = createAdminClient();

  const { count: existentes, error: countError } = await admin
    .from("beta_invitaciones")
    .select("id", { count: "exact", head: true });
  if (countError) {
    console.error("beta/generar count error:", countError.message);
    return NextResponse.json({ error: "No se pudo consultar beta_invitaciones" }, { status: 500 });
  }

  const yaExistian = existentes ?? 0;
  if (yaExistian >= cantidad) {
    return NextResponse.json({ ok: true, ya_existian: yaExistian, creados: 0, errores: [], codigos: [] });
  }

  const aCrear = cantidad - yaExistian;
  const stripe = getStripe();
  const codigos: string[] = [];
  const errores: { codigo: string; error: string }[] = [];

  for (let i = 0; i < aCrear; i++) {
    const codigo = generarCodigo();
    try {
      const promo = await stripe.promotionCodes.create({
        promotion: { type: "coupon", coupon: couponId },
        code: codigo,
        max_redemptions: 1,
      });

      const { error: insertError } = await admin.from("beta_invitaciones").insert({
        codigo,
        stripe_promotion_code: promo.id,
        estado: "pendiente",
      });
      if (insertError) throw new Error(insertError.message);

      codigos.push(codigo);
    } catch (e) {
      errores.push({ codigo, error: e instanceof Error ? e.message : "Error desconocido" });
    }
  }

  return NextResponse.json({
    ok: true,
    creados: codigos.length,
    ya_existian: yaExistian,
    errores,
    codigos,
  });
}
