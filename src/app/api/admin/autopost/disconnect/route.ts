import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/adminAudit";
import { descifrarToken } from "@/lib/crypto-tokens";
import { META_GRAPH } from "@/lib/meta/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Desconecta una cuenta: revoca el permiso en Meta (best-effort) y borra la
// fila (cascade elimina sus posts). Solo admin.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { cuenta_id } = await request.json() as { cuenta_id?: string };
  if (!cuenta_id) return NextResponse.json({ error: "Falta cuenta_id" }, { status: 400 });

  const { data: cuenta } = await auth.admin
    .from("autopost_cuentas").select("id, etiqueta, token_cifrado").eq("id", cuenta_id).maybeSingle();
  if (!cuenta) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

  // Revocar en Meta (no bloquea el borrado si falla).
  try {
    const token = descifrarToken(cuenta.token_cifrado);
    await fetch(`${META_GRAPH}/me/permissions?access_token=${encodeURIComponent(token)}`, { method: "DELETE" });
  } catch (e) {
    console.error("autopost disconnect revoke:", e instanceof Error ? e.message : e);
  }

  const { error } = await auth.admin.from("autopost_cuentas").delete().eq("id", cuenta_id);
  if (error) return NextResponse.json({ error: "No se pudo desconectar" }, { status: 500 });

  await logAdminAction(auth.admin, auth.adminId, "autopost_desconectar", auth.adminId, `cuenta ${cuenta.etiqueta}`);
  return NextResponse.json({ ok: true });
}
