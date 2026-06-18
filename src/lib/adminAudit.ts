import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";

type AdminOk = { ok: true; adminId: string; admin: SupabaseClient };
type AdminErr = { ok: false; status: number; error: string };

/** Verifica que el llamante es admin (sesión por cookies). Devuelve el cliente service-role. */
export async function requireAdmin(): Promise<AdminOk | AdminErr> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "No autenticado" };
  const { data: caller } = await supabase.from("profiles").select("es_admin").eq("id", user.id).single();
  if (!caller?.es_admin) return { ok: false, status: 403, error: "No autorizado" };
  return { ok: true, adminId: user.id, admin: createAdminClient() };
}

/** Registra una acción de admin (auditoría). No bloquea si falla. */
export async function logAdminAction(
  admin: SupabaseClient,
  adminId: string,
  accion: string,
  targetUserId: string,
  motivo?: string | null,
): Promise<void> {
  try {
    await admin.from("logs_admin_actions").insert({
      admin_id: adminId,
      accion,
      target_user_id: targetUserId,
      motivo: motivo?.trim() || null,
    });
  } catch (e) {
    console.error("logAdminAction error:", e instanceof Error ? e.message : e);
  }
}
