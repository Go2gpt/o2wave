import type { SupabaseClient } from "@supabase/supabase-js";

export type TipoEntidad = "ong_pequena" | "ong_mediana" | "empresa";

export const PERMISOS = {
  ong_pequena: {
    redesSociales: ["Instagram", "Facebook"],
    postsMaxMes: 10,
    imagenesIaMaxMes: 10,
    tiktok: false,
    calendario: false,
    envioPdf: false,
    estadisticas: false,
  },
  ong_mediana: {
    redesSociales: ["Instagram", "Facebook", "TikTok"],
    postsMaxMes: null,
    imagenesIaMaxMes: null,
    tiktok: true,
    calendario: true,
    envioPdf: true,
    estadisticas: true,
  },
  empresa: {
    redesSociales: ["Instagram", "Facebook", "TikTok"],
    postsMaxMes: null,
    imagenesIaMaxMes: null,
    tiktok: true,
    calendario: true,
    envioPdf: true,
    estadisticas: true,
  },
} as const;

export type Permisos = (typeof PERMISOS)[TipoEntidad];

/**
 * Devuelve los permisos para un tipo de entidad. Acepta null o valores
 * antiguos; por defecto aplica el plan más restrictivo (ong_pequena).
 *
 * Si esAdmin es true, devuelve acceso total a todas las funciones,
 * independientemente del tipo_entidad o plan (para revisar/probar la app).
 */
export function getPermisos(
  tipoEntidad: string | null | undefined,
  esAdmin: boolean | null | undefined = false
): Permisos {
  if (esAdmin) {
    // Acceso total: el tier "empresa" tiene todas las features habilitadas.
    return PERMISOS.empresa;
  }
  if (tipoEntidad && tipoEntidad in PERMISOS) {
    return PERMISOS[tipoEntidad as TipoEntidad];
  }
  return PERMISOS.ong_pequena;
}

/** Cuenta los posts del usuario en el mes natural actual. */
export async function contarPostsMes(supabase: SupabaseClient, userId: string): Promise<number> {
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count } = await supabase
    .from("generated_posts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", inicioMes);
  return count ?? 0;
}
