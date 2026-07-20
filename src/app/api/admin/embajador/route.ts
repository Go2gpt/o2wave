import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/adminAudit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Marca / desmarca una cuenta como embajador (acceso pro sin cobro). Solo admin.
// Marcar → es_embajador=true y plan_actual='pro' si no lo estaba. NO cancela la
// sub de Stripe (Sebas la cancela aparte); devuelve aviso si sigue activa.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { user_id, embajador } = await request.json() as { user_id?: string; embajador?: boolean };
  if (!user_id || typeof embajador !== "boolean") return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { data: prof } = await auth.admin
    .from("profiles").select("plan_actual, plan_estado, stripe_subscription_id").eq("id", user_id).single();

  const patch: Record<string, unknown> = { es_embajador: embajador };
  if (embajador && prof?.plan_actual !== "pro") patch.plan_actual = "pro";

  const { error } = await auth.admin.from("profiles").update(patch).eq("id", user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(auth.admin, auth.adminId, embajador ? "marcar_embajador" : "desmarcar_embajador", user_id);

  // Aviso: si al marcar embajador sigue teniendo sub Stripe activa, hay que cancelarla a mano.
  const avisoSubActiva = embajador && !!prof?.stripe_subscription_id && prof?.plan_estado === "activa";
  return NextResponse.json({ ok: true, aviso_sub_activa: avisoSubActiva });
}
