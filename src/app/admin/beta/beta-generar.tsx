"use client";

import { useState } from "react";

type Resultado = {
  ok: boolean;
  creados: number;
  ya_existian: number;
  errores: { codigo: string; error: string }[];
  codigos: string[];
};

export default function BetaGenerar({ existentes }: { existentes: number }) {
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generar = async () => {
    if (!confirm("¿Generar los códigos del programa Beta en Stripe? Es idempotente: si ya hay 100, no crea más.")) return;
    setLoading(true);
    setError(null);
    setRes(null);
    try {
      const r = await fetch("/api/admin/beta/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: 100 }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al generar");
      setRes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={generar}
        disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-black text-sm transition-all active:scale-[0.98] disabled:opacity-50"
        style={{ backgroundColor: "#f9b23b" }}
      >
        {loading
          ? "Generando…"
          : existentes >= 100
            ? `Completar códigos (ya hay ${existentes})`
            : "Generar 100 códigos Beta"}
      </button>

      {error && <p className="mt-3 text-sm" style={{ color: "#f87171" }}>⚠️ {error}</p>}

      {res && (
        <div className="mt-4 text-sm">
          <p className="text-white/80">
            Creados: <strong>{res.creados}</strong> · Ya existían: <strong>{res.ya_existian}</strong> · Errores: <strong>{res.errores.length}</strong>
          </p>
          {res.codigos.length > 0 && (
            <textarea
              readOnly
              value={res.codigos.join("\n")}
              className="mt-3 w-full h-40 bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-mono text-white/80"
            />
          )}
          {res.errores.length > 0 && (
            <p className="mt-2 text-xs" style={{ color: "#f87171" }}>
              Algunos códigos fallaron: {res.errores.slice(0, 3).map((e) => e.error).join("; ")}…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
