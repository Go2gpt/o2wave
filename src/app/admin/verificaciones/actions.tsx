"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerificacionActions({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"aprobar" | "rechazar" | null>(null);
  const [error, setError] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");

  const aprobar = async () => {
    setError(""); setLoading("aprobar");
    try {
      const res = await fetch("/api/admin/verificaciones/aprobar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al aprobar");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aprobar");
      setLoading(null);
    }
  };

  const rechazar = async () => {
    if (!motivo.trim()) { setError("Escribe un motivo."); return; }
    setError(""); setLoading("rechazar");
    try {
      const res = await fetch("/api/admin/verificaciones/rechazar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, motivo }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error al rechazar");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar");
      setLoading(null);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {!rechazando ? (
        <div className="flex gap-2">
          <button onClick={aprobar} disabled={loading !== null}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#0F0F0F] disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#93bf30" }}>
            {loading === "aprobar" ? "Aprobando..." : "Aprobar"}
          </button>
          <button onClick={() => setRechazando(true)} disabled={loading !== null}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-white/20 text-white/80 hover:bg-white/5 disabled:opacity-50 transition-all">
            Rechazar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
            placeholder="Motivo del rechazo (se enviará por email)..."
            className="w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#f9b23b]" />
          <div className="flex gap-2">
            <button onClick={rechazar} disabled={loading !== null}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f9b23b" }}>
              {loading === "rechazar" ? "Enviando..." : "Confirmar rechazo"}
            </button>
            <button onClick={() => { setRechazando(false); setMotivo(""); setError(""); }} disabled={loading !== null}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/20 text-white/60 hover:bg-white/5">
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs font-medium text-[#f9b23b]">⚠️ {error}</p>}
    </div>
  );
}
