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

// Cuentas concretas con la publicación directa habilitada aunque la función no
// esté abierta a todos (App Review de Meta: la cuenta de prueba del revisor
// necesita ver/probar la función sin darle rol admin). Coma-separado por env,
// con la cuenta de review por defecto.
const REVIEW_EMAILS = (process.env.PUBLICACION_DIRECTA_EMAILS || "meta-review@o2wave.app")
  .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

/** ¿Puede ESTE usuario usar la publicación directa? (abierta a todos, es admin, o cuenta de review). */
export async function publicacionDirectaHabilitada(supabase: SupabaseClient, userId: string): Promise<boolean> {
  if (publicacionDirectaAbiertaGlobal()) return true;
  const { data } = await supabase.from("profiles").select("es_admin").eq("id", userId).maybeSingle();
  if ((data as { es_admin?: boolean } | null)?.es_admin) return true;
  if (REVIEW_EMAILS.length) {
    const { data: u } = await supabase.auth.getUser();
    const email = u?.user?.email?.toLowerCase();
    if (email && REVIEW_EMAILS.includes(email)) return true;
  }
  return false;
}
