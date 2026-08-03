import type { SupabaseClient } from "@supabase/supabase-js";
import type { TipoPieza } from "@/lib/autopost/tipos";

/**
 * Rotación canónica v2.1 (guía Marketing sección 2): ciclo de 8 semanas
 * 2 Educativa + 3 Arquetipo + 2 Producto + 1 Dato. Determinista y persistido por
 * cuenta en autopost_rotacion_estado. Solo servidor.
 */

/** Causas polarizadas prohibidas (filtro pre-generación, guía 4B). */
export const CAUSAS_PROHIBIDAS = [
  "politica_partidista", "religion", "orientacion_sexual", "inmigracion",
  "ecologismo_militante", "feminismo_militante", "veganismo_militante",
  "conflictos_internacionales", "casos_judiciales_polemicos", "salud_publica_polemica",
];

export interface CicloEntry { tipo: TipoPieza; variante?: string }

// Tabla exacta de la guía v2.1 sección 2 (semana 1..8).
const CICLO: CicloEntry[] = [
  { tipo: "piezaEducativa", variante: "B" },   // 1 — arranque suave con firma
  { tipo: "piezaArquetipoONG" },               // 2 — Ana
  { tipo: "piezaProducto" },                   // 3 — empuje comercial
  { tipo: "piezaArquetipoEmpresa" },           // 4 — Carlos
  { tipo: "piezaDato" },                       // 5 — ancla de autoridad
  { tipo: "piezaArquetipoParticular" },        // 6 — María
  { tipo: "piezaEducativa", variante: "A" },   // 7 — valor puro sin CTA
  { tipo: "piezaProducto" },                   // 8 — cierre comercial
];

/**
 * Devuelve el tipo/variante que toca para la cuenta y AVANZA el puntero del
 * ciclo (persistido). Primera vez → semana 1. Reproducible.
 */
export async function siguienteTipo(admin: SupabaseClient, cuentaId: string): Promise<CicloEntry & { semana: number }> {
  const { data: estado } = await admin
    .from("autopost_rotacion_estado").select("semana_ciclo").eq("cuenta_id", cuentaId).maybeSingle();
  const semana = estado?.semana_ciclo && estado.semana_ciclo >= 1 && estado.semana_ciclo <= 8 ? estado.semana_ciclo : 1;
  const entry = CICLO[semana - 1];
  const siguiente = (semana % 8) + 1;
  await admin.from("autopost_rotacion_estado").upsert({
    cuenta_id: cuentaId, semana_ciclo: siguiente, ultimo_tipo: entry.tipo, updated_at: new Date().toISOString(),
  }, { onConflict: "cuenta_id" });
  return { ...entry, semana };
}
