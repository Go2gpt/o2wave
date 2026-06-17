"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Accion = "aprobar" | "rechazar" | "aclaracion" | "notas" | null;

export default function VerificacionActions({ userId, initialNotas }: { userId: string; initialNotas?: string | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState<Accion>(null);
  const [error, setError] = useState("");
  const [modo, setModo] = useState<"idle" | "rechazar" | "aclaracion">("idle");
  const [motivo, setMotivo] = useState("");      // rechazo
  const [mensaje, setMensaje] = useState("");    // aclaración
  const [notas, setNotas] = useState(initialNotas ?? "");

  const post = async (url: string, body: Record<string, unknown>, accion: Accion) => {
    setError(""); setLoading(accion);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error");
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setLoading(null);
      return false;
    }
  };

  const aprobar = () => post("/api/admin/verificaciones/aprobar", { user_id: userId, notas }, "aprobar");

  const rechazar = async () => {
    if (!motivo.trim()) { setError("Escribe un motivo."); return; }
    await post("/api/admin/verificaciones/rechazar", { user_id: userId, motivo, notas }, "rechazar");
  };

  const pedirAclaracion = async () => {
    if (!mensaje.trim()) { setError("Escribe el mensaje de aclaración."); return; }
    await post("/api/admin/verificaciones/aclaracion", { user_id: userId, mensaje, notas }, "aclaracion");
  };

  const guardarNotas = async () => {
    const ok = await post("/api/admin/verificaciones/notas", { user_id: userId, notas }, "notas");
    if (ok) setLoading(null);
  };

  const txtCls = "w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#f9b23b]";

  return (
    <div className="mt-4 space-y-3">
      {/* Notas internas (siempre visibles) */}
      <div>
        <label className="block text-[11px] font-semibold text-white/40 mb-1">Notas internas (solo admin)</label>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
          placeholder="Anota lo que necesites sobre esta revisión..." className={txtCls} />
        <button onClick={guardarNotas} disabled={loading !== null}
          className="mt-1.5 text-xs font-semibold text-white/60 hover:text-white disabled:opacity-50">
          {loading === "notas" ? "Guardando..." : "Guardar notas"}
        </button>
      </div>

      {modo === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button onClick={aprobar} disabled={loading !== null}
            className="flex-1 min-w-[110px] py-2.5 rounded-xl text-sm font-bold text-[#0F0F0F] disabled:opacity-50 transition-all active:scale-[0.98]"
            style={{ backgroundColor: "#93bf30" }}>
            {loading === "aprobar" ? "Aprobando..." : "✅ Aprobar"}
          </button>
          <button onClick={() => { setModo("aclaracion"); setError(""); }} disabled={loading !== null}
            className="flex-1 min-w-[110px] py-2.5 rounded-xl text-sm font-bold border border-white/20 text-white/80 hover:bg-white/5 disabled:opacity-50 transition-all">
            ℹ️ Pedir aclaración
          </button>
          <button onClick={() => { setModo("rechazar"); setError(""); }} disabled={loading !== null}
            className="flex-1 min-w-[110px] py-2.5 rounded-xl text-sm font-bold border border-white/20 text-white/80 hover:bg-white/5 disabled:opacity-50 transition-all">
            ❌ Rechazar
          </button>
        </div>
      )}

      {modo === "rechazar" && (
        <div className="space-y-2">
          <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2}
            placeholder="Motivo del rechazo (se enviará por email)..." className={txtCls} />
          <div className="flex gap-2">
            <button onClick={rechazar} disabled={loading !== null}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f9b23b" }}>
              {loading === "rechazar" ? "Enviando..." : "Confirmar rechazo"}
            </button>
            <button onClick={() => { setModo("idle"); setMotivo(""); setError(""); }} disabled={loading !== null}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/20 text-white/60 hover:bg-white/5">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {modo === "aclaracion" && (
        <div className="space-y-2">
          <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={3}
            placeholder="Qué necesitas que aclaren o aporten (se enviará por email)..." className={txtCls} />
          <div className="flex gap-2">
            <button onClick={pedirAclaracion} disabled={loading !== null}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-[#0F0F0F] disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#f9b23b" }}>
              {loading === "aclaracion" ? "Enviando..." : "Enviar aclaración"}
            </button>
            <button onClick={() => { setModo("idle"); setMensaje(""); setError(""); }} disabled={loading !== null}
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
