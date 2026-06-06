import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PackSemanal } from "@/types";

export interface PackAcceso { admin: SupabaseClient; userId: string; pack: PackSemanal; }

/**
 * Verifica sesión y propiedad del pack. Devuelve el cliente admin (para escribir,
 * porque packs_semanales solo tiene política de SELECT para usuarios), el userId
 * y el pack. Lanza un objeto { status, message } si no procede.
 */
export async function accederPack(packId: string): Promise<PackAcceso> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw { status: 401, message: "No autenticado" };

  const admin = createAdminClient();
  const { data: pack } = await admin.from("packs_semanales").select("*").eq("id", packId).single();
  if (!pack) throw { status: 404, message: "Pack no encontrado" };
  if (pack.user_id !== user.id) throw { status: 403, message: "No autorizado" };

  return { admin, userId: user.id, pack: pack as PackSemanal };
}

export function errorStatus(e: unknown): { status: number; message: string } {
  if (e && typeof e === "object" && "status" in e) {
    const o = e as { status: number; message?: string };
    return { status: o.status, message: o.message || "Error" };
  }
  return { status: 500, message: e instanceof Error ? e.message : "Error desconocido" };
}
