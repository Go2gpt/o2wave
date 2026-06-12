import type { useRouter } from "next/navigation";

const KEY_PLAN = "plan_pendiente_checkout";
const KEY_CICLO = "ciclo_pendiente_checkout";

// Planes de pago (los gratuitos no pasan por checkout).
const PLANES_PAGO = ["ong_mediana", "earlybird", "standard", "pro"];

/** Guarda el plan/ciclo elegido en /plans para retomar el checkout tras el onboarding. */
export function guardarPlanPendiente(plan: string | null, ciclo: string | null) {
  if (plan && PLANES_PAGO.includes(plan)) {
    // localStorage (no sessionStorage): el enlace de confirmación de email
    // suele abrirse en otra pestaña, y sessionStorage no sobreviviría.
    localStorage.setItem(KEY_PLAN, plan);
    if (ciclo === "mensual" || ciclo === "anual") localStorage.setItem(KEY_CICLO, ciclo);
  }
}

function limpiar() {
  localStorage.removeItem(KEY_PLAN);
  localStorage.removeItem(KEY_CICLO);
}

/** Borra cualquier plan pendiente (opt-out "empezar gratis por ahora"). */
export function descartarPlanPendiente() {
  limpiar();
}

/**
 * Al terminar el onboarding: si hay un plan de pago pendiente, lanza el Stripe
 * Checkout con ese plan/ciclo; si no, va al dashboard. Tolerante a fallos:
 * ante cualquier error cae al dashboard sin bloquear al usuario.
 */
export async function irACheckoutODashboard(router: ReturnType<typeof useRouter>): Promise<void> {
  let plan: string | null = null;
  let ciclo: string | null = null;
  try {
    plan = localStorage.getItem(KEY_PLAN);
    ciclo = localStorage.getItem(KEY_CICLO);
  } catch { /* storage no disponible */ }

  if (!plan || !PLANES_PAGO.includes(plan)) {
    router.push("/dashboard");
    return;
  }

  try {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, ciclo: ciclo === "anual" ? "anual" : "mensual" }),
    });
    const data = await res.json();
    limpiar();
    if (data.url) { window.location.href = data.url; return; }
    router.push("/dashboard");
  } catch {
    limpiar();
    router.push("/dashboard");
  }
}
