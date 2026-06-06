"use client";

import { useEffect, useState } from "react";
import BackLink from "@/components/BackLink";
import Toast, { type ToastState } from "@/components/Toast";
import { PLANES } from "@/lib/plans";
import type { PlanActual, PlanCiclo } from "@/types";

export default function PlansView({ grupo, planActual, success, cancelled }: {
  grupo: "ong" | "empresa"; planActual: PlanActual; success: boolean; cancelled: boolean;
}) {
  const [ciclo, setCiclo] = useState<PlanCiclo>("mensual");
  const [loading, setLoading] = useState<PlanActual | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (success) setToast({ message: "¡Suscripción completada! Puede tardar unos segundos en reflejarse.", type: "success" });
    else if (cancelled) setToast({ message: "Has cancelado el proceso de pago.", type: "info" });
  }, [success, cancelled]);

  const planes = PLANES.filter((p) => p.para === grupo);

  const suscribir = async (plan: PlanActual) => {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, ciclo }) });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      throw new Error(data.error || "No se pudo iniciar el pago");
    } catch (e) {
      setToast({ message: `Error: ${e instanceof Error ? e.message : "fallo"}`, type: "error" });
      setLoading(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto pb-8">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="px-5 pt-8 pb-1">
        <BackLink>Atrás</BackLink>
      </div>
      <div className="px-5 pb-3">
        <h1 className="text-xl font-bold text-gray-900">Planes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Elige el que mejor se adapta a tu organización</p>
      </div>

      {/* Toggle mensual / anual */}
      <div className="px-5 mb-4">
        <div className="flex bg-gray-100 rounded-full p-1">
          {(["mensual", "anual"] as PlanCiclo[]).map((c) => (
            <button key={c} onClick={() => setCiclo(c)}
              className="flex-1 py-2 rounded-full text-sm font-bold transition-all"
              style={ciclo === c ? { backgroundColor: "#fff", color: "#f9b23b", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" } : { color: "#9ca3af" }}>
              {c === "mensual" ? "Mensual" : "Anual"}
              {c === "anual" && <span className="ml-1 text-[10px] font-bold" style={{ color: "#93bf30" }}>−2 meses</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-3">
        {planes.map((plan) => {
          const esActual = plan.id === planActual;
          const precio = ciclo === "mensual" ? plan.precioMensual : plan.precioAnual;
          const esGratis = plan.id === "ong_pequena";
          const color = plan.destacado ? "#f9b23b" : "#374151";
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
                    {esGratis
                      ? <p className="text-2xl font-black" style={{ color }}>Gratis</p>
                      : <><p className="text-2xl font-black" style={{ color }}>{precio}€</p><p className="text-[10px] text-gray-400">{ciclo === "mensual" ? "/mes" : "/año"}</p></>}
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "#93bf30" }}>✓</span>
                      <span className="text-xs text-gray-600">{f}</span>
                    </div>
                  ))}
                  {plan.noIncluye?.map((f) => (
                    <div key={f} className="flex items-center gap-2 opacity-40">
                      <span className="text-xs text-gray-400">✗</span>
                      <span className="text-xs text-gray-400">{f}</span>
                    </div>
                  ))}
                </div>

                {esActual ? (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-semibold" style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}>
                    Plan activo
                  </div>
                ) : esGratis ? (
                  <div className="w-full py-3 rounded-xl text-center text-sm font-medium text-gray-400">
                    Plan básico gratuito
                  </div>
                ) : (
                  <button onClick={() => suscribir(plan.id)} disabled={loading !== null}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{ backgroundColor: "#f9b23b" }}>
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
  );
}
