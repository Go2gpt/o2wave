import type { SupabaseClient } from "@supabase/supabase-js";
import type { TipoPieza } from "@/lib/autopost/tipos";

/**
 * Rotación canónica v2.1 (guía Marketing sección 2): ciclo de 8 semanas
 * 2 Educativa + 3 Arquetipo + 2 Producto + 1 Dato. Determinista y persistido por
 * cuenta en autopost_rotacion_estado. Solo servidor.
 *
 * Diseño: tipoActual() SOLO LEE (no avanza); avanzarCiclo() se llama tras una
 * generación EXITOSA — así una pieza que falla no consume su slot del ciclo
 * (evita que la distribución de arquetipos se desequilibre). La subvariante de
 * cada arquetipo rota de forma determinista (contador por tipo en JSON).
 */

/** Causas polarizadas prohibidas (filtro pre-generación, guía 4B). */
export const CAUSAS_PROHIBIDAS = [
  "politica_partidista", "religion", "orientacion_sexual", "inmigracion",
  "ecologismo_militante", "feminismo_militante", "veganismo_militante",
  "conflictos_internacionales", "casos_judiciales_polemicos", "salud_publica_polemica",
];

export interface CicloEntry { tipo: TipoPieza; variante?: string }
export interface EstadoCiclo extends CicloEntry { semana: number; subIndex: number; subIndices: Record<string, number> }

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

function parseSub(raw: string | null | undefined): Record<string, number> {
  try { const o = raw ? JSON.parse(raw) : {}; return o && typeof o === "object" ? o : {}; } catch { return {}; }
}

/** LEE el tipo/variante/subvariante que toca (sin avanzar). */
export async function tipoActual(admin: SupabaseClient, cuentaId: string): Promise<EstadoCiclo> {
  const { data } = await admin
    .from("autopost_rotacion_estado").select("semana_ciclo, ultima_subvariante").eq("cuenta_id", cuentaId).maybeSingle();
  const semana = data?.semana_ciclo && data.semana_ciclo >= 1 && data.semana_ciclo <= 8 ? data.semana_ciclo : 1;
  const entry = CICLO[semana - 1];
  const subIndices = parseSub(data?.ultima_subvariante);
  return { ...entry, semana, subIndex: subIndices[entry.tipo] ?? 0, subIndices };
}

/** AVANZA el ciclo (llamar SOLO tras generar con éxito). Incrementa la subvariante del tipo usado. */
export async function avanzarCiclo(admin: SupabaseClient, cuentaId: string, estado: EstadoCiclo): Promise<void> {
  const siguiente = (estado.semana % 8) + 1;
  const subIndices = { ...estado.subIndices, [estado.tipo]: (estado.subIndices[estado.tipo] ?? 0) + 1 };
  await admin.from("autopost_rotacion_estado").upsert({
    cuenta_id: cuentaId, semana_ciclo: siguiente, ultimo_tipo: estado.tipo,
    ultima_subvariante: JSON.stringify(subIndices), updated_at: new Date().toISOString(),
  }, { onConflict: "cuenta_id" });
}
