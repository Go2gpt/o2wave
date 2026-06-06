import type { PlanActual, PlanCiclo } from "@/types";

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
    id: "ong_pequena", nombre: "ONG pequeña", para: "ong", precioMensual: 0, precioAnual: 0,
    features: ["Instagram y Facebook", "Texto + imágenes con IA", "Calendario de días clave", "Stats básicas"],
    noIncluye: ["TikTok", "Pack semanal automático"],
  },
  {
    id: "ong_mediana", nombre: "ONG mediana", para: "ong", precioMensual: 9, precioAnual: 90, destacado: true,
    features: ["Todo lo de ONG pequeña", "TikTok", "Pack semanal automático", "Stats avanzadas", "Posts ilimitados"],
  },
  {
    id: "earlybird", nombre: "Empresa Early Bird", para: "empresa", precioMensual: 9, precioAnual: 90, destacado: true,
    features: ["9€/mes durante 12 meses", "Todo lo de Standard", "Luego pasa a Standard (19€)"],
  },
  {
    id: "standard", nombre: "Empresa Standard", para: "empresa", precioMensual: 19, precioAnual: 190,
    features: ["Instagram y Facebook", "Texto + imágenes con IA", "Hasta 30 posts/mes", "Stats básicas"],
    noIncluye: ["TikTok", "Pack semanal automático"],
  },
  {
    id: "pro", nombre: "Empresa Pro", para: "empresa", precioMensual: 39, precioAnual: 390,
    features: ["Todo lo de Standard", "TikTok", "Posts ilimitados", "Pack semanal automático", "Stats avanzadas"],
  },
];

export function planMeta(id: PlanActual): PlanMeta | undefined {
  return PLANES.find((p) => p.id === id);
}

/** Variable de entorno que contiene el price ID para un plan+ciclo. */
const ENV_KEY: Record<string, string> = {
  ong_mediana_mensual: "STRIPE_PRICE_ONG_MEDIANA_MENSUAL",
  ong_mediana_anual: "STRIPE_PRICE_ONG_MEDIANA_ANUAL",
  earlybird_mensual: "STRIPE_PRICE_EARLYBIRD_MENSUAL",
  earlybird_anual: "STRIPE_PRICE_EARLYBIRD_ANUAL",
  standard_mensual: "STRIPE_PRICE_STANDARD_MENSUAL",
  standard_anual: "STRIPE_PRICE_STANDARD_ANUAL",
  pro_mensual: "STRIPE_PRICE_PRO_MENSUAL",
  pro_anual: "STRIPE_PRICE_PRO_ANUAL",
};

/** Devuelve el price ID de Stripe para un plan+ciclo (solo servidor). null si no aplica. */
export function priceId(plan: PlanActual, ciclo: PlanCiclo): string | null {
  if (plan === "ong_pequena") return null; // gratis, sin producto Stripe
  const env = ENV_KEY[`${plan}_${ciclo}`];
  return (env && process.env[env]) || null;
}
