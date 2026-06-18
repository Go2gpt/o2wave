"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CuentaAcciones({ userId, suspendida }: { userId: string; suspendida: boolean }) {
  const router = useRouter();
  const [modal, setModal] = useState<null | "suspender" | "eliminar">(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [motivo, setMotivo] = useState("");
  const [confirmTexto, setConfirmTexto] = useState("");

  const cerrar = () => { setModal(null); setError(""); setMotivo(""); setConfirmTexto(""); };

  const suspender = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/cuentas/suspender", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, suspender: !suspendida, motivo }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error");
      cerrar(); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); setLoading(false); }
  };

  const eliminar = async () => {
    if (confirmTexto !== "ELIMINAR") { setError('Escribe ELIMINAR para confirmar.'); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/admin/cuentas/eliminar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, motivo }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error");
      router.push("/admin/cuentas");
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); setLoading(false); }
  };

  const txtCls = "w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#f9b23b]";

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => setModal("suspender")}
          className="flex-1 py-3 rounded-xl text-sm font-bold border border-white/20 text-white/90 hover:bg-white/5 active:scale-[0.98]">
          {suspendida ? "Reactivar cuenta" : "Suspender cuenta"}
        </button>
        <button onClick={() => setModal("eliminar")}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98]" style={{ backgroundColor: "#dc2743" }}>
          Eliminar cuenta
        </button>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[80] p-0 sm:p-4" onClick={cerrar}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 w-full sm:max-w-md text-white" onClick={(e) => e.stopPropagation()}>
            {modal === "suspender" ? (
              <>
                <h3 className="font-black text-lg mb-1">{suspendida ? "Reactivar cuenta" : "Suspender cuenta"}</h3>
                <p className="text-sm text-white/60 mb-4">
                  {suspendida
                    ? "La cuenta volverá a tener acceso normal al servicio."
                    : "La cuenta no podrá acceder al servicio (verá la página de suspensión). La suscripción de Stripe NO se cancela."}
                </p>
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2}
                  placeholder="Motivo (opcional, queda en el registro de auditoría)…" className={`${txtCls} mb-3`} />
                <div className="flex gap-2">
                  <button onClick={cerrar} disabled={loading} className="flex-1 py-3 rounded-xl text-sm font-bold border border-white/20 text-white/70">Cancelar</button>
                  <button onClick={suspender} disabled={loading} className="flex-1 py-3 rounded-xl text-sm font-bold text-[#0F0F0F] disabled:opacity-50"
                    style={{ backgroundColor: suspendida ? "#93bf30" : "#f9b23b" }}>
                    {loading ? "Aplicando…" : suspendida ? "Reactivar" : "Suspender"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-black text-lg mb-1" style={{ color: "#f87171" }}>Eliminar cuenta</h3>
                <p className="text-sm text-white/60 mb-3">
                  Acción <strong>irreversible</strong>: se cancela la suscripción de Stripe, se borran documentos, datos y la cuenta de acceso (RGPD).
                </p>
                <p className="text-sm text-white/80 mb-1">Escribe <strong>ELIMINAR</strong> para confirmar:</p>
                <input value={confirmTexto} onChange={(e) => setConfirmTexto(e.target.value)} placeholder="ELIMINAR" className={`${txtCls} mb-3`} />
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2}
                  placeholder="Motivo (opcional, queda en auditoría)…" className={`${txtCls} mb-3`} />
                <div className="flex gap-2">
                  <button onClick={cerrar} disabled={loading} className="flex-1 py-3 rounded-xl text-sm font-bold border border-white/20 text-white/70">Cancelar</button>
                  <button onClick={eliminar} disabled={loading || confirmTexto !== "ELIMINAR"} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                    style={{ backgroundColor: "#dc2743" }}>
                    {loading ? "Eliminando…" : "Eliminar definitivamente"}
                  </button>
                </div>
              </>
            )}
            {error && <p className="text-xs font-medium mt-3" style={{ color: "#f87171" }}>⚠️ {error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
