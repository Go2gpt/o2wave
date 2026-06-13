"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import BackLink from "@/components/BackLink";
import Toast, { type ToastState } from "@/components/Toast";
import { PLANES } from "@/lib/plans";
import { BETA_ACTIVA } from "@/lib/constants";
import type { PlanActual, PlanCiclo } from "@/types";

export default function PlansView({ autenticado, esAdmin, grupo, planActual, success, cancelled, empresaSinSub }: {
  autenticado: boolean;
  esAdmin: boolean;
  grupo: "ong" | "empresa";
  planActual: PlanActual | null;
  success: boolean;
  cancelled: boolean;
  empresaSinSub?: boolean;
}) {
  const router = useRouter();
  const [ciclo, setCiclo] = useState<PlanCiclo>("mensual");
  const [loading, setLoading] = useState<PlanActual | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [promo, setPromo] = useState("");
  const [condicionesAbiertas, setCondicionesAbiertas] = useState(false);

  // Bypass temporal por código promocional: aceptamos cualquier código no vacío
  // (sin validación todavía) y dejamos pasar fijando la cookie que lee el middleware.
  // TODO: sustituir por el sistema real de validación de códigos.
  const aplicarPromo = () => {
    if (!promo.trim()) return;
    document.cookie = "o2_promo_bypass=1; path=/; max-age=2592000";
    router.push("/dashboard");
  };

  useEffect(() => {
    if (success) setToast({ message: "¡Suscripción completada! Puede tardar unos segundos en reflejarse.", type: "success" });
    else if (cancelled) setToast({ message: "Has cancelado el proceso de pago.", type: "info" });
  }, [success, cancelled]);

  // Visitante: ve todos los planes. Logueado: solo los de su grupo (ong/empresa).
  const planes = autenticado ? PLANES.filter((p) => p.para === grupo) : PLANES;

  const suscribir = async (plan: PlanActual) => {
    setLoading(plan);
    try {
      // Durante la beta solo mensual (el cupón BETA1MES no se puede limitar por intervalo).
      const cicloPago: PlanCiclo = BETA_ACTIVA ? "mensual" : ciclo;
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, ciclo: cicloPago }) });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      throw new Error(data.error || "No se pudo iniciar el pago");
    } catch (e) {
      setToast({ message: `Error: ${e instanceof Error ? e.message : "fallo"}`, type: "error" });
      setLoading(null);
    }
  };

  const btnNaranja = "w-full py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-50";

  return (
    // Fondo claro propio: /plans vive fuera del layout (protected), cuyo <body> es
    // negro. Sin esto, el título quedaría gris sobre negro (ilegible).
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
    <div className="max-w-lg mx-auto pb-10">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Cabecera: pública (visitante) o BackLink (logueado) */}
      {autenticado ? (
        <div className="px-5 pt-8 pb-1"><BackLink>Atrás</BackLink></div>
      ) : (
        <header className="px-5 pt-6 pb-2 flex items-center justify-between">
          <Link href="/welcome" aria-label="o2Wave"><Logo size="sm" /></Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-gray-600">Iniciar sesión</Link>
            <Link href="/register" className="text-sm font-bold text-white px-4 py-2 rounded-full" style={{ backgroundColor: "#f9b23b" }}>Empezar gratis</Link>
          </div>
        </header>
      )}

      {/* Bloqueo empresa sin suscripción: aviso + código promocional */}
      {empresaSinSub && (
        <div className="mx-5 mb-4 mt-2 rounded-2xl p-4" style={{ backgroundColor: "#fff8ef", border: "1px solid #f9d9a8" }}>
          <p className="text-sm font-bold" style={{ color: "#b9791a" }}>Activa tu suscripción para continuar</p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            Las empresas necesitan una suscripción activa para acceder al servicio. Si tienes un código promocional, ingrésalo aquí.
          </p>
          <div className="flex gap-2 mt-3">
            <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Código promocional"
              className="flex-1 border-2 border-gray-100 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none"
              onFocus={(e) => (e.target.style.borderColor = "#f9b23b")} onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")} />
            <button onClick={aplicarPromo} disabled={!promo.trim()}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: "#f9b23b" }}>
              Aplicar
            </button>
          </div>
        </div>
      )}

      <div className="px-5 pb-3 pt-2">
        <h1 className="text-xl font-bold text-gray-900">{autenticado ? "Planes" : "Elige tu plan"}</h1>
        <p className="text-sm text-gray-500 mt-0.5">El que mejor se adapta a tu organización o empresa.</p>
        {/* Banner de lanzamiento (beta) */}
        {BETA_ACTIVA && (
          <div className="mt-3 rounded-xl px-3 py-2 text-sm font-medium" style={{ backgroundColor: "#f0f7e6", color: "#3f6212" }}>
            🎁 Lanzamiento: usa el código <strong>BETA1MES</strong> en el checkout para tu primer mes gratis.
          </div>
        )}
      </div>

      {/* Toggle mensual / anual ("Anual" deshabilitado durante la beta) */}
      <div className="px-5 mb-4">
        <div className="flex bg-gray-100 rounded-full p-1">
          {(["mensual", "anual"] as PlanCiclo[]).map((c) => {
            const bloqueado = c === "anual" && BETA_ACTIVA;
            return (
              <button key={c} type="button"
                onClick={() => { if (!bloqueado) setCiclo(c); }}
                disabled={bloqueado}
                title={bloqueado ? "Disponible próximamente. Por ahora suscríbete al plan mensual." : undefined}
                className="flex-1 py-2 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-1.5"
                style={
                  bloqueado
                    ? { color: "#c4c4c4", cursor: "not-allowed" }
                    : ciclo === c
                      ? { backgroundColor: "#fff", color: "#f9b23b", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                      : { color: "#9ca3af" }
                }>
                {c === "mensual" ? "Mensual" : "Anual"}
                {bloqueado && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#e5e7eb", color: "#9ca3af" }}>
                    Pronto
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 space-y-3">
        {planes.map((plan) => {
          const esActual = autenticado && !esAdmin && plan.id === planActual;
          const precio = ciclo === "mensual" ? plan.precioMensual : plan.precioAnual;
          const esGratis = plan.id === "ong_pequena";
          const color = plan.destacado ? "#f9b23b" : "#374151";
          const anualSinDescuento = plan.precioMensual != null ? plan.precioMensual * 12 : null;
          const ahorro = ciclo === "anual" && anualSinDescuento != null && plan.precioAnual != null ? anualSinDescuento - plan.precioAnual : 0;
          const mostrarAhorro = !esGratis && ciclo === "anual" && ahorro > 0;
          return (
            <div key={plan.id} className="bg-white rounded-2xl overflow-hidden shadow-sm"
              style={{ border: `2px solid ${esActual ? "#f9b23b" : plan.destacado ? "#f9b23b" : "#e5e7eb"}` }}>
              {(esActual || plan.destacado) && (
                <div className="px-4 py-2 text-center text-[11px] font-bold"
                  style={{ backgroundColor: esActual ? "#f9b23b" : "#fff8ef", color: esActual ? "#fff" : "#f9b23b" }}>
                  {esActual ? "✓ Tu plan" : plan.id === "earlybird" ? "🐦 Oferta de lanzamiento" : "Recomendado"}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="font-black text-gray-900">{plan.nombre}</p>
                  <div className="text-right">
                    {esGratis ? (
                      <p className="text-2xl font-black" style={{ color }}>Gratis</p>
                    ) : (
                      <>
                        {mostrarAhorro && <p className="text-xs text-gray-400 line-through leading-none mb-0.5">{anualSinDescuento}€</p>}
                        <p className="text-2xl font-black leading-none" style={{ color }}>{precio}€</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{ciclo === "mensual" ? "/mes" : "/año"}</p>
                        {mostrarAhorro && (
                          <span className="inline-block mt-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f0f7e6", color: "#93bf30" }}>
                            Ahorras {ahorro}€
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "#93bf30" }}>✓</span>
                      <span className="text-xs text-gray-600">{f}</span>
                    </div>
                  ))}
                  {/* Admin (bypass): todo accesible → pintamos lo "no incluido" como ✓ para no
                      contradecir su dashboard, donde sí tiene esas features activas. */}
                  {plan.noIncluye?.map((f) => (
                    esAdmin ? (
                      <div key={f} className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: "#93bf30" }}>✓</span>
                        <span className="text-xs text-gray-600">{f}</span>
                      </div>
                    ) : (
                      <div key={f} className="flex items-center gap-2 opacity-40">
                        <span className="text-xs text-gray-400">✗</span>
                        <span className="text-xs text-gray-400">{f}</span>
                      </div>
                    )
                  ))}
                </div>

                {/* Condiciones del plan gratuito (solo card ONG pequeña) */}
                {esGratis && (
                  <div className="mb-3">
                    <button type="button" onClick={() => setCondicionesAbiertas((v) => !v)}
                      className="text-xs font-semibold" style={{ color: "#93bf30" }}>
                      {condicionesAbiertas ? "Ocultar condiciones del plan gratuito" : "Ver condiciones del plan gratuito →"}
                    </button>
                    {condicionesAbiertas && (
                      <div className="mt-2 rounded-xl p-3 text-xs text-gray-600 leading-relaxed" style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
                        <ul className="space-y-1 list-disc pl-4">
                          <li>Solo entidades sin ánimo de lucro (CIF G, R, V, N).</li>
                          <li>Presupuesto anual inferior a 50.000 €.</li>
                          <li>Máximo 1 trabajador remunerado (resto voluntariado).</li>
                          <li>10 publicaciones al mes (Instagram y Facebook).</li>
                          <li>Sin TikTok ni pack semanal automático.</li>
                        </ul>
                        <Link href="/terminos#plan-gratuito" className="inline-block mt-2 font-semibold" style={{ color: "#93bf30" }}>
                          Leer texto legal completo →
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* CTA según modo: visitante / admin / logueado-actual / logueado-otro */}
                {!autenticado ? (
                  <button onClick={() => router.push(`/register?plan=${plan.id}&ciclo=${BETA_ACTIVA ? "mensual" : ciclo}`)} className={btnNaranja} style={{ backgroundColor: "#f9b23b" }}>
                    {esGratis ? "Empezar gratis" : "Suscribirme"}
                  </button>
                ) : esAdmin ? (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-medium text-gray-400">Acceso completo (admin)</div>
                ) : esActual ? (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-semibold" style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}>Plan activo</div>
                ) : esGratis ? (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-medium text-gray-400">Plan básico gratuito</div>
                ) : (
                  <button onClick={() => suscribir(plan.id)} disabled={loading !== null} className={btnNaranja} style={{ backgroundColor: "#f9b23b" }}>
                    {loading === plan.id ? "Redirigiendo…" : planActual === "ong_pequena" ? "Suscribirse" : "Cambiar a este plan"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="px-5 pt-4 text-center text-xs text-gray-400">
        Precios con IVA incluido · Cancela cuando quieras · Pago seguro con Stripe
      </p>
    </div>
    </div>
  );
}
