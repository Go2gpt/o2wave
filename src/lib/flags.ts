import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Publicación directa a redes (conectar cuenta + publicar server-side). Mientras
 * Meta no apruebe el App Review, solo funciona para cuentas con rol en la app
 * (admins). Este flag controla la apertura a TODOS los usuarios: cuando el App
 * Review esté aprobado, poner PUBLICACION_DIRECTA_ABIERTA=true en Vercel.
 */
export function publicacionDirectaAbiertaGlobal(): boolean {
  return process.env.PUBLICACION_DIRECTA_ABIERTA === "true";
}

/** ¿Puede ESTE usuario usar la publicación directa? (abierta a todos, o es admin). */
export async function publicacionDirectaHabilitada(supabase: SupabaseClient, userId: string): Promise<boolean> {
  if (publicacionDirectaAbiertaGlobal()) return true;
  const { data } = await supabase.from("profiles").select("es_admin").eq("id", userId).maybeSingle();
  return !!(data as { es_admin?: boolean } | null)?.es_admin;
}
