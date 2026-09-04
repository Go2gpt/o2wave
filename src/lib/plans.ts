import type { PlanActual, PlanCiclo } from "@/types";

/* ------------------------------ Feature gating ------------------------------ */

/** Qué features incluye cada plan. Las redes usan slug en minúscula (instagram/facebook/tiktok/whatsapp). */
const FEATURES_FULL = ["instagram", "facebook", "whatsapp", "tiktok", "linkedin", "text_image", "dias_clave", "stats_basic", "pack_semanal", "stats_advanced", "posts_ilimitados", "multi_marca", "api_access"];
const FEATURES_FREE = ["instagram", "facebook", "whatsapp", "text_image", "dias_clave", "stats_basic"];

export const FEATURES: Record<string, string[]> = {
  // Modelo vigente v3.0: free (limitado) / pro y pro_nonprofit (idénticos, full).
  free:          FEATURES_FREE,
  pro:           FEATURES_FULL,
  pro_nonprofit: FEATURES_FULL,
  // Legacy (sin usuarios de pago; ong_pequena = alias del tier gratuito).
  ong_pequena: FEATURES_FREE,
  ong_mediana: ["instagram", "facebook", "whatsapp", "tiktok", "linkedin", "text_image", "dias_clave", "stats_basic", "pack_semanal", "stats_advanced", "posts_ilimitados"],
  earlybird:   ["instagram", "facebook", "whatsapp", "tiktok", "linkedin", "text_image", "dias_clave", "stats_basic", "pack_semanal", "stats_advanced"],
  standard:    ["instagram", "facebook", "whatsapp", "tiktok", "linkedin", "text_image", "dias_clave", "stats_basic", "pack_semanal", "stats_advanced"],
};

/** Posts gratuitos al mes para ong_pequena (reset el día 1 de cada mes). */
export const LIMITE_POSTS_GRATIS = 10;

/** Posts/mes para Standard y Earlybird (Standard a precio reducido). */
export const LIMITE_POSTS_STANDARD = 30;

/** Perfil mínimo para el gating. El plan vive en `plan_actual` (null → ong_pequena). */
export interface PerfilGating {
  plan_actual?: string | null;
  plan_estado?: string | null;
  es_admin?: boolean | null;
  posts_gratis_usados?: number | null;
}

/** ¿El plan del usuario incluye esta feature? Admin → siempre true. */
export function canUseFeature(profile: PerfilGating | null, feature: string): boolean {
  if (!profile) return false;
  if (profile.es_admin) return true;
  const plan = profile.plan_actual ?? "ong_pequena";
  return (FEATURES[plan] ?? FEATURES.ong_pequena).includes(feature);
}

/**
 * ¿La suscripción está al corriente? Bloquea solo estados de PAGO PENDIENTE
 * (suspendida / past_due / unpaid). NO bloquea "cancelada": ese usuario vuelve
 * al plan gratuito ong_pequena y se rige por el límite de posts gratis.
 * Admin y estado vacío (free nuevo) → activo.
 */
export function isPlanActivo(profile: PerfilGating | null): boolean {
  if (!profile) return false;
  if (profile.es_admin) return true;
  const estado = profile.plan_estado ?? "activa";
  return !["suspendida", "past_due", "unpaid"].includes(estado);
}

/**
 * ¿Puede generar otro post este mes? Pro/ONG mediana y admin → ilimitado;
 * Standard/Earlybird → bajo 30/mes; ong_pequena (free) y resto → bajo 10/mes.
 */
export function puedeGenerarPostGratis(profile: PerfilGating | null): boolean {
  if (!profile) return false;
  if (profile.es_admin) return true;
  const plan = profile.plan_actual ?? "ong_pequena";
  if (FEATURES[plan]?.includes("posts_ilimitados")) return true; // pro, ong_mediana
  const usados = profile.posts_gratis_usados ?? 0;
  if (plan === "standard" || plan === "earlybird") return usados < LIMITE_POSTS_STANDARD;
  return usados < LIMITE_POSTS_GRATIS;
}

/** Límite de posts/mes según plan. Infinity = ilimitado (admin, pro, ONG mediana). */
export function limitePostsMes(profile: PerfilGating | null): number {
  if (!profile) return LIMITE_POSTS_GRATIS;
  if (profile.es_admin) return Infinity;
  const plan = profile.plan_actual ?? "ong_pequena";
  if (FEATURES[plan]?.includes("posts_ilimitados")) return Infinity;
  if (plan === "standard" || plan === "earlybird") return LIMITE_POSTS_STANDARD;
  return LIMITE_POSTS_GRATIS;
}

/**
 * Catálogo de planes de o2Wave. Los price IDs reales viven en variables de
 * entorno (se resuelven en servidor con priceId()). ong_pequena es gratis y NO
 * es producto en Stripe.
 */
export interface PlanMeta {
  id: PlanActual;
  nombre: string;
  /** Para qué tipo_entidad se ofrece. */
  para: "ong" | "empresa";
  precioMensual: number | null; // €/mes (IVA incluido). null = gratis.
  precioAnual: number | null;   // €/año (IVA incluido).
  destacado?: boolean;
  features: string[];
  noIncluye?: string[];
}

export const PLANES: PlanMeta[] = [
  {
    id: "free", nombre: "Free", para: "ong", precioMensual: 0, precioAnual: 0,
    features: ["Instagram y Facebook", "Texto + imágenes con IA", "Calendario de días clave", "10 publicaciones al mes"],
    noIncluye: ["X, LinkedIn y TikTok", "Pack semanal automático", "Posts ilimitados"],
  },
  {
    id: "pro", nombre: "Pro", para: "empresa", precioMensual: 4.95, precioAnual: null, destacado: true,
    features: ["Posts ilimitados", "Todas las redes (IG, FB, X, LinkedIn, TikTok)", "Scheduling avanzado", "Generación IA superior", "Plantillas de marca"],
  },
  {
    id: "pro_nonprofit", nombre: "Pro Nonprofit", para: "ong", precioMensual: 1.95, precioAnual: null,
    features: ["Todo lo de Pro, al mismo nivel", "Precio especial para ONG con CIF/NIF verificado", "60% de descuento sobre Pro"],
  },
];

export function planMeta(id: PlanActual): PlanMeta | undefined {
  return PLANES.find((p) => p.id === id);
}

/**
 * Planes visibles para un grupo de cuenta (v3.0). TODOS ven Free y Pro (mismo
 * producto y precio para ONG, empresa y particular). Pro Nonprofit (1,99€) solo
 * se ofrece a ONG, y además requiere CIF/NIF verificado para poder contratarlo
 * (el gating real lo aplica el endpoint de checkout).
 */
export function planesParaGrupo(grupo: "ong" | "empresa" | "particular"): PlanMeta[] {
  return PLANES.filter((p) => p.id !== "pro_nonprofit" || grupo === "ong");
}

/** Nombre del plan adaptado al grupo de cuenta. En v3.0 el nombre es el mismo para todos. */
export function nombrePlanPorGrupo(plan: PlanMeta, _grupo: "ong" | "empresa" | "particular"): string {
  return plan.nombre;
}

/** Variable de entorno que contiene el price ID para un plan+ciclo. */
const ENV_KEY: Record<string, string> = {
  // Modelo vigente v3.0. STRIPE_PRICE_PRO_MENSUAL se repunta al nuevo precio 4,90€.
  pro_mensual: "STRIPE_PRICE_PRO_MENSUAL",
  pro_nonprofit_mensual: "STRIPE_PRICE_PRO_NONPROFIT_MENSUAL",
  // Legacy (huérfanos, sin plan que los use; se conservan por si acaso).
  ong_mediana_mensual: "STRIPE_PRICE_ONG_MEDIANA_MENSUAL",
  ong_mediana_anual: "STRIPE_PRICE_ONG_MEDIANA_ANUAL",
  earlybird_mensual: "STRIPE_PRICE_EARLYBIRD_MENSUAL",
  earlybird_anual: "STRIPE_PRICE_EARLYBIRD_ANUAL",
  standard_mensual: "STRIPE_PRICE_STANDARD_MENSUAL",
  standard_anual: "STRIPE_PRICE_STANDARD_ANUAL",
  pro_anual: "STRIPE_PRICE_PRO_ANUAL",
};

/** Devuelve el price ID de Stripe para un plan+ciclo (solo servidor). null si no aplica. */
export function priceId(plan: PlanActual, ciclo: PlanCiclo): string | null {
  if (plan === "free" || plan === "ong_pequena") return null; // gratis, sin producto Stripe
  const env = ENV_KEY[`${plan}_${ciclo}`];
  return (env && process.env[env]) || null;
}

/** Mapeo inverso: a partir de un price ID de Stripe, deduce plan + ciclo. */
export function planDesdePrice(price: string | null | undefined): { plan: PlanActual; ciclo: PlanCiclo } | null {
  if (!price) return null;
  for (const [key, env] of Object.entries(ENV_KEY)) {
    if (process.env[env] && process.env[env] === price) {
      const ciclo: PlanCiclo = key.endsWith("_anual") ? "anual" : "mensual";
      const plan = key.replace(/_(mensual|anual)$/, "") as PlanActual;
      return { plan, ciclo };
    }
  }
  return null;
}

/**
 * Duración de la Fase 1 del Early Bird antes de pasar a Standard.
 * Anual: 1 año (1 ciclo). Mensual: 12 meses (12 ciclos).
 * (El SDK de Stripe usa `duration`, no `iterations`.)
 */
export function earlyBirdDuration(ciclo: PlanCiclo): { interval: "month" | "year"; interval_count: number } {
  return ciclo === "anual" ? { interval: "year", interval_count: 1 } : { interval: "month", interval_count: 12 };
}
