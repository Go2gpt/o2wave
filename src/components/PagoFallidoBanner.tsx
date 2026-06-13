"use client";

import { useState } from "react";

// Banner global de impago: visible en páginas protegidas cuando el último pago
// falló (plan_estado suspendida/past_due/unpaid). CTA al Stripe Billing Portal.
export default function PagoFallidoBanner() {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const abrirPortal = async () => {
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      setError(data.mensaje || "No se pudo abrir el portal de suscripción.");
    } catch {
      setError("Error al abrir el portal de suscripción.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="px-4 pt-4">
      <div className="max-w-lg mx-auto rounded-2xl p-4" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-700">Hubo un problema con tu último pago</p>
            <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
              Actualiza tu método de pago para mantener tu suscripción activa.
            </p>
            {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
            <button onClick={abrirPortal} disabled={cargando}
              className="mt-3 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#dc2626" }}>
              {cargando ? "Abriendo…" : "Actualizar método de pago"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
