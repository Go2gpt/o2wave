import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/adminAudit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Suspende / reactiva una cuenta (toggle). NO cancela la suscripción de Stripe.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { user_id, suspender, motivo } = await request.json() as { user_id: string; suspender: boolean; motivo?: string };
  if (!user_id) return NextResponse.json({ error: "Falta user_id" }, { status: 400 });
  if (user_id === auth.adminId) return NextResponse.json({ error: "No puedes suspender tu propia cuenta." }, { status: 400 });

  const { error } = await auth.admin.from("profiles").update({ cuenta_suspendida: suspender === true }).eq("id", user_id);
  if (error) {
    console.error("suspender error:", error.message);
    return NextResponse.json({ error: "No se pudo actualizar la cuenta" }, { status: 500 });
  }

  await logAdminAction(auth.admin, auth.adminId, suspender ? "suspender" : "reactivar", user_id, motivo);
  return NextResponse.json({ ok: true, suspendida: suspender === true });
}
